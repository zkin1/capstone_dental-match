# Integrante 2 — incorporación directa a main

Esta carpeta contiene archivos ya terminados copiados del proyecto DentalMatch local. No modificar su contenido ni crear carpetas por semana o por integrante dentro del repositorio.

El integrante 1 debe haber terminado primero su push a main. Luego copiar el contenido de esta carpeta conservando su estructura normal:

    .env.example
    Dockerfile
    docker-compose.yml
    jest.config.js
    scripts/
    src/infrastructure/database/

## Subida

    cd C:\ruta\al\capstone_dental-match
    git switch main
    git pull --rebase origin main

Copiar todo el contenido de esta carpeta al directorio raíz del repositorio Capstone.

Después ejecutar:

    git add .env.example Dockerfile docker-compose.yml jest.config.js scripts src/infrastructure/database
    git commit -m "feat(database): incorporar migraciones y ejecución reproducible [DMC-003 DMC-004]"
    git push origin main
    git log -1 --oneline

No modificar los archivos, no usar git reset --hard y no usar git push --force.
