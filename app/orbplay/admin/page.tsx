import type { Metadata } from "next";
import { DEFAULT_CONFIG } from "../config";
import { loadConfig } from "../store";
import { AdminForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cài đặt OrbPlay", robots: { index: false } };

export default async function Page() {
  const initial = await loadConfig(true).catch(() => null);
  return <AdminForm initial={initial ?? DEFAULT_CONFIG} loadError={!initial} canSave={!!process.env.ORBPLAY_ADMIN_PASSWORD} />;
}
