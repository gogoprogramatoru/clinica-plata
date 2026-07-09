-- Rulat automat de imaginea MySQL DOAR la prima inițializare a volumului.
-- Acordă userului aplicației drepturi globale ca Prisma Migrate să poată crea
-- "shadow database"-ul temporar folosit în dev. Doar pentru development local.
GRANT ALL PRIVILEGES ON *.* TO 'clinica'@'%';
FLUSH PRIVILEGES;
