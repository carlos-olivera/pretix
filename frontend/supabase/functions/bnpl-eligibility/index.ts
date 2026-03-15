import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EligibilityRequest {
  user_id: string;
  item_id: number;
  ticket_price: number;
  organizer: string;
  event: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { user_id, item_id, ticket_price, organizer, event }: EligibilityRequest = await req.json();

    // Get ticket BNPL configuration
    const { data: config, error: configError } = await supabaseClient
      .from("ticket_bnpl_config")
      .select("*")
      .eq("pretix_organizer", organizer)
      .eq("pretix_event", event)
      .eq("pretix_item_id", item_id)
      .maybeSingle();

    if (configError) {
      throw configError;
    }

    // Check if BNPL is enabled for this ticket
    if (!config || !config.bnpl_enabled) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reasons: ["BNPL not available for this ticket"],
          available_plans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check ticket price limit
    if (config.maximum_ticket_price && ticket_price > config.maximum_ticket_price) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reasons: [`Ticket price exceeds maximum of €${config.maximum_ticket_price}`],
          max_price: config.maximum_ticket_price,
          available_plans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get user's KYC profile
    const { data: kycProfile, error: kycError } = await supabaseClient
      .from("user_kyc_profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (kycError) {
      throw kycError;
    }

    // Check KYC verification
    if (!kycProfile || kycProfile.verification_status !== "verified") {
      return new Response(
        JSON.stringify({
          eligible: false,
          reasons: ["KYC verification required"],
          kyc_required: true,
          available_plans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get user's risk score
    const { data: riskScore, error: riskError } = await supabaseClient
      .from("risk_scores")
      .select("*")
      .eq("user_id", user_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (riskError) {
      throw riskError;
    }

    // Check risk score
    if (riskScore && riskScore.score < config.minimum_user_risk_score) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reasons: ["Risk score too low for BNPL"],
          required_risk_score: config.minimum_user_risk_score,
          user_risk_score: riskScore.score,
          available_plans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check active agreements limit
    const { data: activeAgreements, error: agreementsError } = await supabaseClient
      .from("bnpl_agreements")
      .select("id")
      .eq("user_id", user_id)
      .in("status", ["pending", "active"]);

    if (agreementsError) {
      throw agreementsError;
    }

    if (activeAgreements && activeAgreements.length >= 3) {
      return new Response(
        JSON.stringify({
          eligible: false,
          reasons: ["Maximum number of active BNPL agreements reached (3)"],
          active_agreements: activeAgreements.length,
          available_plans: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get available plans
    const { data: allPlans, error: plansError } = await supabaseClient
      .from("bnpl_plans")
      .select("*")
      .eq("enabled", true)
      .order("display_order", { ascending: true });

    if (plansError) {
      throw plansError;
    }

    // Filter plans based on configuration
    const availablePlans = config.allowed_plan_ids && config.allowed_plan_ids.length > 0
      ? allPlans?.filter((p) => config.allowed_plan_ids.includes(p.id)) || []
      : allPlans || [];

    return new Response(
      JSON.stringify({
        eligible: true,
        available_plans: availablePlans,
        user_risk_score: riskScore?.score,
        active_agreements: activeAgreements?.length || 0,
        kyc_verified: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking BNPL eligibility:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
