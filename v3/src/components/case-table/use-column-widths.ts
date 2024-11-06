import { useState, useEffect } from "react";
import { TColumn } from "./case-table-types";
import { useCollectionContext } from "../../hooks/use-collection-context";
import { useDataSet } from "../../hooks/use-data-set";

export const useColumnWidths = (columns: TColumn[]) => {
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(new Map());
  const collectionId = useCollectionContext();
  const { data } = useDataSet();

  useEffect(() => {
    const newColumnWidths = new Map<string, number>();
    columns.forEach((column: TColumn) => {
      let maxWidth = 0;
      data?.getCasesForCollection(collectionId).forEach((row) => {
        const cellContent = data.getStrValue(row.__id__, column.key);
        const tempElement = document.createElement('div');
        tempElement.textContent = cellContent || '';
        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        document.body.appendChild(tempElement);
        maxWidth = Math.max(maxWidth, tempElement.offsetWidth);
        document.body.removeChild(tempElement);
      });
      newColumnWidths.set(column.key, maxWidth + 20);
    });
    setColumnWidths(newColumnWidths);
  }, [columns, data, collectionId]);

  return columnWidths;
};
