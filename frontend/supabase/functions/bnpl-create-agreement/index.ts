import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateAgreementRequest {
  user_id: string;
  plan_id: string;
  pretix_organizer: string;
  pretix_event: string;
  pretix_item_id: number;
  pretix_variation_id?: number;
  ticket_price: number;
  event_date: string;
  quantity?: number;
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

    const requestData: CreateAgreementRequest = await req.json();
    const {
      user_id,
      plan_id,
      pretix_organizer,
      pretix_event,
      pretix_item_id,
      pretix_variation_id,
      ticket_price,
      event_date,
      quantity = 1,
    } = requestData;

    // Validate KYC profile
    const { data: kycProfile, error: kycError } = await supabaseClient
      .from("user_kyc_profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (kycError || !kycProfile || kycProfile.verification_status !== "verified") {
      return new Response(
        JSON.stringify({ error: "KYC verification required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Get BNPL plan
    const { data: plan, error: planError } = await supabaseClient
      .from("bnpl_plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Calculate amounts
    const totalAmount = ticket_price * quantity;
    const upfrontAmount = (totalAmount * plan.upfront_percentage) / 100;
    const remainingAmount = totalAmount - upfrontAmount;
    const numberOfInstallments = plan.number_of_installments;

    // Calculate final payment deadline
    const eventDateTime = new Date(event_date);
    const finalPaymentDeadline = new Date(eventDateTime);
    finalPaymentDeadline.setDate(finalPaymentDeadline.getDate() - 7);

    // Generate agreement number
    const agreementNumber = `BNPL-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create BNPL agreement
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("bnpl_agreements")
      .insert({
        agreement_number: agreementNumber,
        user_id,
        kyc_profile_id: kycProfile.id,
        plan_id,
        pretix_organizer,
        pretix_event,
        pretix_item_id,
        ticket_price,
        total_amount: totalAmount,
        upfront_amount: upfrontAmount,
        remaining_amount: remainingAmount,
        number_of_installments: numberOfInstallments,
        status: "pending",
        ticket_reservation_status: "reserved",
        event_date,
        final_payment_deadline: finalPaymentDeadline.toISOString(),
        terms_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (agreementError) {
      console.error("Error creating agreement:", agreementError);
      throw agreementError;
    }

    // Create ticket reservation
    const reservationExpiration = new Date();
    reservationExpiration.setHours(reservationExpiration.getHours() + 24);

    const { data: reservation, error: reservationError } = await supabaseClient
      .from("ticket_reservations")
      .insert({
        agreement_id: agreement.id,
        user_id,
        pretix_organizer,
        pretix_event,
        pretix_item_id,
        pretix_variation_id,
        quantity,
        reservation_status: "reserved",
        expires_at: reservationExpiration.toISOString(),
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Error creating reservation:", reservationError);
      throw reservationError;
    }

    // Generate installment schedule
    const installments = [];
    const now = new Date();
    const installmentAmount = remainingAmount / (numberOfInstallments - 1);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const daysToAdd = (i - 1) * plan.installment_frequency_days;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Set grace period end
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + plan.grace_period_days);

      installments.push({
        agreement_id: agreement.id,
        installment_number: i,
        amount: i === 1 ? upfrontAmount : installmentAmount,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
        grace_period_ends_at: gracePeriodEnd.toISOString(),
      });
    }

    const { error: installmentsError } = await supabaseClient
      .from("installment_schedules")
      .insert(installments);

    if (installmentsError) {
      console.error("Error creating installments:", installmentsError);
      throw installmentsError;
    }

    // Recalculate risk score
    const { data: existingScore } = await supabaseClient
      .from("risk_scores")
      .select("*")
      .eq("user_id", user_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseScore = existingScore?.score || 70;
    const { data: activeAgreements } = await supabaseClient
      .from("bnpl_agreements")
      .select("id, total_amount")
      .eq("user_id", user_id)
      .in("status", ["pending", "active"]);

    const activeBNPLCount = (activeAgreements?.length || 0) + 1;
    const totalBNPLValue = (activeAgreements?.reduce((sum, a) => sum + Number(a.total_amount), 0) || 0) + totalAmount;

    let newScore = baseScore;
    if (activeBNPLCount > 3) newScore -= 10;
    if (totalBNPLValue > 5000) newScore -= 10;
    newScore = Math.max(0, Math.min(100, newScore));

    await supabaseClient
      .from("risk_scores")
      .insert({
        user_id,
        score: newScore,
        active_bnpl_count: activeBNPLCount,
        total_bnpl_value: totalBNPLValue,
        factors: {
          new_agreement_created: true,
          active_count: activeBNPLCount,
          total_value: totalBNPLValue,
        },
      });

    // Get full agreement with relations
    const { data: fullAgreement } = await supabaseClient
      .from("bnpl_agreements")
      .select(`
        *,
        plan:bnpl_plans(*),
        installments:installment_schedules(*),
        reservation:ticket_reservations(*)
      `)
      .eq("id", agreement.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        agreement: fullAgreement,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error creating BNPL agreement:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
