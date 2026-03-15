import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReleaseTicketRequest {
  agreement_id: string;
  email: string;
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

    const { agreement_id, email }: ReleaseTicketRequest = await req.json();

    // Get agreement with reservation
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("bnpl_agreements")
      .select(`
        *,
        reservation:ticket_reservations(*)
      `)
      .eq("id", agreement_id)
      .single();

    if (agreementError || !agreement) {
      return new Response(
        JSON.stringify({ error: "Agreement not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    if (agreement.ticket_reservation_status !== "released") {
      return new Response(
        JSON.stringify({ error: "Ticket not ready for release" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const reservation = agreement.reservation[0];
    if (!reservation) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Create Pretix order
    const pretixApiUrl = Deno.env.get("PRETIX_API_URL") || "https://pretix.ovopaydemo.live";
    const pretixApiToken = Deno.env.get("PRETIX_API_TOKEN");

    const orderData = {
      email,
      locale: "es",
      payment_provider: "bnpl",
      positions: [
        {
          item: reservation.pretix_item_id,
          variation: reservation.pretix_variation_id || null,
          price: agreement.ticket_price,
          answers: [],
        },
      ],
    };

    const pretixResponse = await fetch(
      `${pretixApiUrl}/api/v1/organizers/${agreement.pretix_organizer}/events/${agreement.pretix_event}/orders/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${pretixApiToken}`,
        },
        body: JSON.stringify(orderData),
      }
    );

    if (!pretixResponse.ok) {
      const errorData = await pretixResponse.json().catch(() => ({}));
      console.error("Pretix order creation failed:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to create Pretix order",
          details: errorData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const pretixOrder = await pretixResponse.json();

    // Update reservation with Pretix order details
    await supabaseClient
      .from("ticket_reservations")
      .update({
        reservation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        pretix_order_code: pretixOrder.code,
        pretix_order_secret: pretixOrder.secret,
      })
      .eq("id", reservation.id);

    // Update agreement
    await supabaseClient
      .from("bnpl_agreements")
      .update({
        ticket_reservation_status: "confirmed",
      })
      .eq("id", agreement_id);

    return new Response(
      JSON.stringify({
        success: true,
        order_code: pretixOrder.code,
        order_secret: pretixOrder.secret,
        order_url: `${pretixApiUrl}/${agreement.pretix_organizer}/${agreement.pretix_event}/order/${pretixOrder.code}/${pretixOrder.secret}/`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error releasing ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
