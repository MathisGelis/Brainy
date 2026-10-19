/**
 * Aliments courants : valeurs moyennes indicatives pour 100 g (ou 100 ml), à corriger au besoin.
 * Glucides hors fibres, comme sur les étiquettes françaises. Choisir un aliment le copie dans
 * « Mes aliments », où il devient modifiable.
 *
 * [nom, kcal, protéines g, glucides g, lipides g, portion g?, libellé de portion?]
 */
type Entry = [string, number, number, number, number, number?, string?]

const ENTRIES: Entry[] = [
  // Viandes, poissons, œufs
  ['Poulet (filet cru)', 120, 22.5, 0, 2.6],
  ['Poulet (filet cuit)', 165, 31, 0, 3.6],
  ['Dinde (escalope crue)', 107, 23.5, 0, 1.5],
  ['Bœuf haché 5 %', 125, 20.5, 0, 5, 100, 'steak'],
  ['Bœuf haché 15 %', 215, 18.5, 0, 15, 100, 'steak'],
  ['Rumsteck', 125, 22, 0, 4],
  ['Porc (filet mignon)', 115, 21, 0, 3.5],
  ['Jambon blanc', 112, 20, 1, 3.2, 40, 'tranche'],
  ['Lardons', 270, 16, 0.5, 23],
  ['Saumon', 200, 20, 0, 13],
  ['Thon au naturel', 110, 25.5, 0, 1],
  ['Cabillaud', 80, 18, 0, 0.7],
  ['Crevettes cuites', 95, 21, 0, 1],
  ['Sardines à l’huile', 210, 24, 0, 13],
  ['Maquereau', 205, 18.5, 0, 14],
  ['Œuf', 143, 12.6, 0.7, 9.5, 55, 'œuf'],
  ['Blanc d’œuf', 52, 11, 0.7, 0.2],
  ['Tofu nature', 125, 13, 1.5, 7.5],
  ['Edamame', 120, 11, 6, 5],
  // Produits laitiers
  ['Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 250, 'verre'],
  ['Lait entier', 64, 3.3, 4.8, 3.6, 250, 'verre'],
  ['Yaourt nature', 56, 4, 5.5, 1.5, 125, 'pot'],
  ['Skyr nature', 63, 11, 4, 0.2, 150, 'pot'],
  ['Fromage blanc 0 %', 46, 7.5, 3.8, 0.1],
  ['Fromage blanc 3 %', 75, 7, 4, 3.2],
  ['Emmental', 375, 28.5, 0.5, 29, 30, 'portion'],
  ['Comté', 410, 27, 0.5, 33.5, 30, 'portion'],
  ['Mozzarella', 240, 18, 1, 18, 125, 'boule'],
  ['Feta', 264, 14, 4, 21],
  ['Parmesan', 400, 32, 0.5, 29],
  ['Camembert', 285, 20, 0.5, 22.5, 30, 'portion'],
  ['Beurre', 745, 0.7, 0.6, 82, 10, 'noisette'],
  ['Crème fraîche épaisse', 300, 2.3, 3, 30],
  ['Crème légère 15 %', 160, 2.8, 4, 15],
  // Féculents, céréales, légumineuses
  ['Riz blanc (cru)', 355, 7, 79, 0.6],
  ['Riz blanc (cuit)', 130, 2.7, 28, 0.3],
  ['Riz complet (cru)', 350, 7.5, 73, 2.7],
  ['Pâtes (crues)', 355, 12.5, 71, 1.5],
  ['Pâtes (cuites)', 150, 5.5, 30, 0.9],
  ['Baguette', 275, 9, 56, 1.3, 50, 'morceau'],
  ['Pain complet', 245, 9, 44, 3, 35, 'tranche'],
  ['Pain de mie', 280, 8.5, 50, 4.5, 25, 'tranche'],
  ['Flocons d’avoine', 370, 13, 60, 7, 40, 'bol'],
  ['Muesli', 365, 9.5, 62, 6.5, 40, 'bol'],
  ['Granola', 450, 9, 62, 17, 40, 'bol'],
  ['Pomme de terre', 80, 2, 17, 0.1],
  ['Patate douce', 86, 1.6, 20, 0.1],
  ['Frites au four', 190, 3, 28, 7],
  ['Quinoa (cru)', 368, 14, 64, 6],
  ['Semoule (crue)', 360, 12.5, 72, 1],
  ['Lentilles (cuites)', 116, 9, 17, 0.4],
  ['Pois chiches (cuits)', 150, 8, 22, 2.6],
  ['Haricots rouges (cuits)', 115, 8, 17, 0.5],
  ['Tortilla de blé', 310, 8.5, 52, 7.5, 60, 'galette'],
  ['Croissant', 410, 8, 45, 21, 45, 'croissant'],
  ['Pain au chocolat', 420, 7.5, 47, 22, 60, 'pain au chocolat'],
  // Fruits
  ['Banane', 90, 1.1, 20, 0.3, 120, 'banane'],
  ['Pomme', 53, 0.3, 11.5, 0.2, 150, 'pomme'],
  ['Poire', 55, 0.4, 11.5, 0.2, 160, 'poire'],
  ['Orange', 45, 0.9, 9, 0.2, 150, 'orange'],
  ['Kiwi', 60, 1, 11, 0.5, 75, 'kiwi'],
  ['Fraises', 32, 0.7, 6, 0.3],
  ['Raisin', 70, 0.7, 16, 0.2],
  ['Myrtilles', 57, 0.7, 12, 0.3],
  ['Mangue', 65, 0.7, 14, 0.4],
  ['Ananas', 50, 0.5, 11.5, 0.1],
  ['Avocat', 165, 2, 2.5, 15, 140, 'avocat'],
  // Légumes
  ['Tomate', 18, 0.9, 3, 0.2, 120, 'tomate'],
  ['Concombre', 13, 0.6, 2, 0.1],
  ['Carotte', 36, 0.8, 7, 0.2, 80, 'carotte'],
  ['Courgette', 17, 1.2, 2.2, 0.3],
  ['Brocoli', 34, 2.8, 4, 0.4],
  ['Haricots verts', 30, 1.8, 4.5, 0.2],
  ['Épinards', 23, 2.9, 1.4, 0.4],
  ['Salade verte', 15, 1.3, 1.5, 0.2],
  ['Poivron', 25, 1, 5, 0.3],
  ['Oignon', 40, 1.1, 8, 0.1],
  ['Champignons de Paris', 22, 3, 1, 0.3],
  ['Aubergine', 25, 1, 3.5, 0.2],
  ['Chou-fleur', 25, 2, 3, 0.3],
  ['Poireau', 30, 1.5, 5, 0.3],
  ['Petits pois', 80, 5.4, 10, 0.4],
  ['Maïs doux', 85, 2.9, 16, 1.2],
  // Matières grasses, sucrés, sauces
  ['Huile d’olive', 900, 0, 0, 100, 10, 'cuillère à soupe'],
  ['Beurre de cacahuète', 600, 25, 15, 50, 15, 'cuillère'],
  ['Amandes', 590, 21, 9, 51, 30, 'poignée'],
  ['Noix', 660, 15, 7, 65, 30, 'poignée'],
  ['Noix de cajou', 580, 18, 27, 46, 30, 'poignée'],
  ['Chocolat noir 70 %', 580, 8, 30, 43, 10, 'carré'],
  ['Pâte à tartiner', 540, 6, 57, 31, 15, 'cuillère'],
  ['Sucre', 400, 0, 100, 0, 5, 'morceau'],
  ['Miel', 325, 0.4, 81, 0, 10, 'cuillère'],
  ['Confiture', 250, 0.5, 60, 0.1, 15, 'cuillère'],
  ['Mayonnaise', 700, 1.3, 1.5, 76, 15, 'cuillère'],
  ['Ketchup', 110, 1.2, 25, 0.2, 15, 'cuillère'],
  ['Sauce tomate', 45, 1.5, 7, 1],
  ['Houmous', 290, 7.5, 13, 23],
  ['Pesto', 480, 5, 5, 49, 15, 'cuillère'],
  ['Chips', 530, 6.5, 50, 33],
  ['Pizza margherita', 240, 10, 30, 8.5],
  ['Whey (protéine en poudre)', 380, 75, 8, 5, 30, 'dose'],
  // Boissons (pour 100 ml)
  ['Jus d’orange', 45, 0.6, 10, 0.1, 200, 'verre'],
  ['Boisson à l’avoine', 45, 1, 7, 1.5, 250, 'verre'],
  ['Boisson au soja', 40, 3.3, 2, 1.8, 250, 'verre'],
  ['Soda', 42, 0, 10.6, 0, 330, 'canette'],
  ['Bière', 43, 0.4, 3.5, 0, 250, 'demi'],
  ['Vin rouge', 85, 0.1, 2.6, 0, 125, 'verre'],
]

export type CatalogFood = {
  name: string
  kcal: number
  protein_dg: number
  carbs_dg: number
  fat_dg: number
  portion_g: number | null
  portion_label: string | null
}

export const CATALOG: CatalogFood[] = ENTRIES.map(([name, kcal, p, c, f, g, label]) => ({
  name,
  kcal,
  protein_dg: Math.round(p * 10),
  carbs_dg: Math.round(c * 10),
  fat_dg: Math.round(f * 10),
  portion_g: g ?? null,
  portion_label: label ?? null,
}))
