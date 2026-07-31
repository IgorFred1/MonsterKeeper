import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cinzas de Varlan — RPG de ação medieval em pixel art" },
      {
        name: "description",
        content:
          "Jogue como um órfão dos campos em Varlan: combate em tempo real, três mapas, loot, magia e escolhas que definem sua reputação.",
      },
      { property: "og:title", content: "Cinzas de Varlan" },
      {
        property: "og:description",
        content:
          "RPG de ação medieval em pixel art: dragões, cavaleiros quebrados e escolhas sujas em um mundo violento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <h1 className="sr-only">Cinzas de Varlan — RPG de ação medieval em pixel art</h1>
      <Game />
    </main>
  );
}
