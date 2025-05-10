
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FormattedDateCellProps {
  dateValue: string | number | Date;
  formatString?: string;
}

export function FormattedDateCell({ dateValue, formatString = "dd MMM yyyy, HH:mm" }: FormattedDateCellProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (dateValue === undefined || dateValue === null) {
      setFormattedDate('-'); // Or some other placeholder for invalid/missing dates
      return;
    }
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        setFormattedDate("Data inválida");
      } else {
        setFormattedDate(format(date, formatString, { locale: ptBR }));
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      setFormattedDate("Erro");
    }
  }, [dateValue, formatString]);

  // Render null or a minimal placeholder initially to match server render.
  // Content will be populated by useEffect on the client.
  return <>{formattedDate === null ? '' : formattedDate}</>;
}
