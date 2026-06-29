"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({
  filename,
  csv,
}: {
  filename: string;
  csv: string;
}) {
  function download() {
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download />
      Ekspor CSV
    </Button>
  );
}
