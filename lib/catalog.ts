export type CatalogProduct = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  unit: string;
  priceCents: number;
  tone: string;
};

export const CATALOG: CatalogProduct[] = [
  { id: "hig-alface-mimosa", name: "Alface Mimosa", shortName: "AM", category: "Higienizados", description: "Folhas prontas para consumo, 130 g.", unit: "pacote", priceCents: 800, tone: "tone-lime" },
  { id: "hig-alface-americana", name: "Alface Americana", shortName: "AA", category: "Higienizados", description: "Folhas higienizadas, 130 g.", unit: "pacote", priceCents: 800, tone: "tone-mint" },
  { id: "hig-alface-mista", name: "Alface Mista", shortName: "AL", category: "Higienizados", description: "Mix de folhas higienizadas, 130 g.", unit: "pacote", priceCents: 800, tone: "tone-forest" },
  { id: "hig-agriao", name: "Agrião", shortName: "AG", category: "Higienizados", description: "Folhas higienizadas, 130 g.", unit: "pacote", priceCents: 900, tone: "tone-sky" },
  { id: "hig-rucula", name: "Rúcula", shortName: "RU", category: "Higienizados", description: "Folhas higienizadas, 130 g.", unit: "pacote", priceCents: 800, tone: "tone-lime" },
  { id: "hig-tomate-grape", name: "Tomate Grape", shortName: "TG", category: "Higienizados", description: "Tomates selecionados, 200 g.", unit: "bandeja", priceCents: 800, tone: "tone-red" },
  { id: "hig-mini-pimentao", name: "Mini Pimentão", shortName: "MP", category: "Higienizados", description: "Pimentões coloridos, 200 g.", unit: "bandeja", priceCents: 1000, tone: "tone-orange" },
  { id: "hig-couve", name: "Couve", shortName: "CO", category: "Higienizados", description: "Couve higienizada, 130 g.", unit: "pacote", priceCents: 700, tone: "tone-forest" },
  { id: "hig-repolho", name: "Repolho", shortName: "RE", category: "Higienizados", description: "Repolho higienizado, 130 g.", unit: "pacote", priceCents: 600, tone: "tone-mint" },
  { id: "hig-manjericao", name: "Manjericão", shortName: "MA", category: "Temperos", description: "Tempero higienizado, 80 g.", unit: "pacote", priceCents: 500, tone: "tone-lime" },
  { id: "hig-coentro", name: "Coentro", shortName: "CT", category: "Temperos", description: "Tempero higienizado, 80 g.", unit: "pacote", priceCents: 500, tone: "tone-forest" },
  { id: "hig-cebolinha", name: "Cebolinha", shortName: "CB", category: "Temperos", description: "Tempero higienizado, 80 g.", unit: "pacote", priceCents: 500, tone: "tone-mint" },
  { id: "org-mini-pimentoes", name: "Mini pimentões", shortName: "MP", category: "Orgânicos de segunda", description: "Bandeja de 200 g, sem agrotóxicos.", unit: "bandeja", priceCents: 800, tone: "tone-orange" },
  { id: "org-repolho", name: "Repolho orgânico", shortName: "RO", category: "Orgânicos de segunda", description: "Peça fresca e sem agrotóxicos.", unit: "peça", priceCents: 500, tone: "tone-mint" },
  { id: "org-cenoura", name: "Cenoura orgânica", shortName: "CE", category: "Orgânicos de segunda", description: "Vendida por quilo.", unit: "kg", priceCents: 800, tone: "tone-orange" },
  { id: "org-pimentao-verde", name: "Pimentão verde", shortName: "PV", category: "Orgânicos de segunda", description: "Bandeja selecionada.", unit: "bandeja", priceCents: 600, tone: "tone-forest" },
  { id: "org-quiabo", name: "Quiabo", shortName: "QU", category: "Orgânicos de segunda", description: "Bandeja de produto orgânico.", unit: "bandeja", priceCents: 600, tone: "tone-lime" },
  { id: "org-abobora-italia", name: "Abóbora Itália", shortName: "AI", category: "Orgânicos de segunda", description: "Bandeja pronta para sua receita.", unit: "bandeja", priceCents: 600, tone: "tone-yellow" },
  { id: "org-chuchu", name: "Chuchu", shortName: "CH", category: "Orgânicos de segunda", description: "Pacote de 500 g.", unit: "pacote", priceCents: 400, tone: "tone-mint" },
  { id: "org-banana-prata", name: "Banana prata", shortName: "BP", category: "Orgânicos de segunda", description: "Vendida por quilo.", unit: "kg", priceCents: 800, tone: "tone-yellow" },
  { id: "org-tomate-grape", name: "Tomate grape orgânico", shortName: "TG", category: "Orgânicos de segunda", description: "Bandeja de 300 g.", unit: "bandeja", priceCents: 600, tone: "tone-red" },
  { id: "org-espinafre", name: "Espinafre", shortName: "ES", category: "Orgânicos de segunda", description: "Higienizado e sem agrotóxicos.", unit: "pacote", priceCents: 500, tone: "tone-forest" },
  { id: "org-chicoria", name: "Chicória", shortName: "CI", category: "Orgânicos de segunda", description: "Higienizada e sem agrotóxicos.", unit: "pacote", priceCents: 600, tone: "tone-lime" },
];
