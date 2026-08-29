import { createFileRoute } from "@tanstack/react-router";
import { ProfitsApp } from "@/components/profits-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ProfitsApp />;
}
