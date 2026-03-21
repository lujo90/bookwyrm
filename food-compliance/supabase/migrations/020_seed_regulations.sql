-- Phase 9: Seed 7 core EU food regulations

INSERT INTO regulations (code, title, summary, applies_to, markets, status, official_url) VALUES
('EU 1169/2011', 'Food Information to Consumers (FIC)', 'Governs mandatory label declarations, nutrition labelling, and allergen labelling for all pre-packed food sold in the EU.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169'),
('EU 1333/2008', 'Food Additives Regulation', 'Controls which food additives are permitted and at what levels in different food categories.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1333'),
('EU 1924/2006', 'Nutrition and Health Claims', 'Regulates the use of nutrition and health claims made on food labels and in advertising.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1924'),
('EU 2018/848', 'Organic Production and Labelling', 'Defines requirements for organic certification, production, and labelling of organic food products.', ARRAY['organic'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0848'),
('EU 2022/1616', 'Packaging and Packaging Waste (PPWR)', 'Sets recyclability requirements and recycled content targets for all food packaging placed on the EU market.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R1616'),
('EU 2073/2005', 'Microbiological Criteria', 'Establishes microbiological criteria for food safety and hygiene of food products.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32005R2073'),
('Directive 2000/13/EC', 'Country of Origin and Lot Marking', 'Requires country of origin declaration and lot marking on all pre-packed food products.', ARRAY['all'], ARRAY['EU'], 'active', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32000L0013');
