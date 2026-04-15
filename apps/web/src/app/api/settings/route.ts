import { NextResponse } from "next/server";

import { getSettingsBundle, updateSettingsBundle } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSettingsBundle();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      rule: {
        isEnabled: boolean;
        thresholdAmount: number;
        recipientMode: string;
      };
      recipients: Array<{
        id: number | null;
        chatId: string;
        label: string;
        isEnabled: boolean;
      }>;
    };

    const settings = await updateSettingsBundle(payload);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
