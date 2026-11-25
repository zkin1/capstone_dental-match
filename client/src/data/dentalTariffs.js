export const tariffSources = {
  university: 'https://odontologia.uchile.cl/dam/jcr%3Ad016482c-e3c9-49ec-ae08-328d652edef0/ARANCEL%20PREGRADO%202026.pdf',
  laboratory: 'https://odontologia.uchile.cl/dam/jcr%3A3621665e-a1ae-48bb-bdca-d3481cfc6d32/ARANCEL%20DE%20LABORATORIO%202026.pdf',
  private: 'https://www.colmena.cl/source/wp-content/uploads/2026/01/Colmena-Arancel-2026-1-1.pdf',
};

// Códigos de las prestaciones en los aranceles publicados de 2026.
export const dentalTariffs = [
  {
    id: 'limpieza', label: 'Limpieza dental', detail: 'Destartraje y limpieza de toda la boca',
    university: 40000, universityCode: 'UTAM07', private: 145806, privateCode: '5001030',
    note: 'El valor de pregrado incluye instrucciones de higiene oral.',
  },
  {
    id: 'tapadura', label: 'Tapadura', detail: 'Restauración directa de una pieza posterior',
    university: 17500, universityCode: 'UTAM08', private: 124829, privateCode: '5005017',
    note: 'El arancel de RedSalud corresponde a una restauración simple con resina.',
  },
  {
    id: 'extraccion', label: 'Extracción a colgajo', detail: 'Extracción quirúrgica de un diente',
    university: 42500, universityCode: 'UTUR03', private: 179189, privateCode: '5003002',
    note: 'El valor de pregrado excluye pabellón. El código de RedSalud también cubre extracción de una pieza semiincluida.',
  },
  {
    id: 'endodoncia', label: 'Endodoncia', detail: 'Tratamiento de conducto de un diente anterior',
    university: 38500, universityCode: 'UTAM06', private: 274321, privateCode: '5006001',
    note: 'El valor de pregrado incluye cuatro radiografías. El código de RedSalud corresponde a un diente anterior vital.',
  },
  {
    id: 'protesis', label: 'Prótesis removible', detail: 'Prótesis parcial acrílica de una arcada',
    university: 107000, universityCode: 'UTAM14', laboratory: 94500, laboratoryCode: 'LB021',
    private: 404564, privateCode: '5008012',
  },
];
