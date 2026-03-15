import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessPaymentRequest {
  installment_id: string;
  payment_method: string;
  payment_provider?: string;
  provider_transaction_id?: string;
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

    const {
      installment_id,
      payment_method,
      payment_provider = "manual",
      provider_transaction_id,
    }: ProcessPaymentRequest = await req.json();

    // Get installment
    const { data: installment, error: installmentError } = await supabaseClient
      .from("installment_schedules")
      .select("*, agreement:bnpl_agreements(*)")
      .eq("id", installment_id)
      .single();

    if (installmentError || !installment) {
      return new Response(
        JSON.stringify({ error: "Installment not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    if (installment.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Installment already paid" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create payment attempt
    const { data: paymentAttempt, error: attemptError } = await supabaseClient
      .from("payment_attempts")
      .insert({
        installment_id,
        agreement_id: installment.agreement_id,
        amount: installment.amount,
        status: "pending",
        payment_method,
        payment_provider,
        provider_transaction_id,
      })
      .select()
      .single();

    if (attemptError) {
      throw attemptError;
    }

    // Simulate payment processing
    // In production, this would integrate with actual payment gateway
    const paymentSucceeded = true; // Replace with actual gateway call

    if (paymentSucceeded) {
      // Mark payment attempt as succeeded
      await supabaseClient
        .from("payment_attempts")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
        })
        .eq("id", paymentAttempt.id);

      // Mark installment as paid
      await supabaseClient
        .from("installment_schedules")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_amount: installment.amount,
          payment_method,
          payment_provider_id: provider_transaction_id,
        })
        .eq("id", installment_id);

      // Update agreement
      const agreement = installment.agreement;
      const newRemainingAmount = Number(agreement.remaining_amount) - Number(installment.amount);

      await supabaseClient
        .from("bnpl_agreements")
        .update({
          remaining_amount: newRemainingAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      // Check if this is the first payment (activate agreement)
      if (installment.installment_number === 1 && agreement.status === "pending") {
        await supabaseClient
          .from("bnpl_agreements")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
          })
          .eq("id", agreement.id);
      }

      // Check if all installments are paid
      const { data: allInstallments } = await supabaseClient
        .from("installment_schedules")
        .select("status")
        .eq("agreement_id", agreement.id);

      const allPaid = allInstallments?.every((i) => i.status === "paid");

      if (allPaid) {
        await supabaseClient
          .from("bnpl_agreements")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", agreement.id);
      }

      // Check if ticket should be released
      const { data: config } = await supabaseClient
        .from("ticket_bnpl_config")
        .select("*")
        .eq("pretix_organizer", agreement.pretix_organizer)
        .eq("pretix_event", agreement.pretix_event)
        .eq("pretix_item_id", agreement.pretix_item_id)
        .maybeSingle();

      const totalPaid = Number(agreement.total_amount) - newRemainingAmount;
      const percentPaid = (totalPaid / Number(agreement.total_amount)) * 100;
      const releaseThreshold = config?.ticket_release_threshold_percentage || 100;

      if (percentPaid >= releaseThreshold && agreement.ticket_reservation_status === "reserved") {
        // Update reservation status to released
        await supabaseClient
          .from("bnpl_agreements")
          .update({
            ticket_reservation_status: "released",
          })
          .eq("id", agreement.id);

        await supabaseClient
          .from("ticket_reservations")
          .update({
            reservation_status: "released",
          })
          .eq("agreement_id", agreement.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_attempt: paymentAttempt,
          installment_status: "paid",
          remaining_amount: newRemainingAmount,
          agreement_status: allPaid ? "completed" : "active",
          ticket_released: percentPaid >= releaseThreshold,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Mark payment attempt as failed
      await supabaseClient
        .from("payment_attempts")
        .update({
          status: "failed",
          failure_reason: "Payment declined",
          completed_at: new Date().toISOString(),
        })
        .eq("id", paymentAttempt.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment failed",
          payment_attempt: paymentAttempt,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
