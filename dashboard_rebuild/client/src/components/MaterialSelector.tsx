import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
import {
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  pptx: "PPT",
  md: "MD",
  txt: "TXT",
};

function getMaterialTypeLabel(fileType: string | null | undefined): string {
  const normalizedRaw = (fileType || "").toLowerCase().trim();
  const normalized = ["", "null", "none"].includes(normalizedRaw) ? "" : normalizedRaw;
  return FILE_TYPE_ICONS[normalized] || (normalized ? normalized.toUpperCase() : "FILE");
}

interface MaterialSelectorProps {
  courseId?: number;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
}

export function MaterialSelector({
  courseId,
  selectedMaterials,
  setSelectedMaterials,
}: MaterialSelectorProps) {
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () => api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  const toggle = (id: number) => {
    setSelectedMaterials(
      selectedMaterials.includes(id)
        ? selectedMaterials.filter((m) => m !== id)
        : [...selectedMaterials, id]
    );
  };

  const toggleAll = () => {
    if (selectedMaterials.length === materials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map((m) => m.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className={`${ICON_SM} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className={`${TEXT_MUTED} text-center py-2`}>
        No materials uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Select all */}
      <label className={`flex items-center gap-1.5 px-1 py-0.5 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer border-b border-muted-foreground/10 pb-1`}>
        <Checkbox
          checked={materials.length > 0 && selectedMaterials.length === materials.length}
          onCheckedChange={toggleAll}
          className="w-3 h-3"
        />
        <span>Select all</span>
        <Badge variant="outline" className={`ml-auto ${TEXT_BADGE} h-4 px-1`}>
          {selectedMaterials.length}/{materials.length}
        </Badge>
      </label>

      {/* Material list */}
      {materials.map((mat) => (
        <label
          key={mat.id}
          className={`flex items-center gap-1.5 px-1 py-0.5 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer`}
        >
          <Checkbox
            checked={selectedMaterials.includes(mat.id)}
            onCheckedChange={() => toggle(mat.id)}
            className="w-3 h-3"
          />
          <FileText className={`${ICON_SM} text-primary/60 shrink-0`} />
          <span className="truncate flex-1">{(mat.title || `Material ${mat.id}`).trim() || `Material ${mat.id}`}</span>
          <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0`}>
            {getMaterialTypeLabel(mat.file_type)}
          </Badge>
        </label>
      ))}
    </div>
  );
}
