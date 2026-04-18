import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export const MultiSelectFilter = ({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) => {
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };

  const display =
    selected.length === 0
      ? `Todos`
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-between gap-2 min-w-[140px]", className)}>
          <span className="truncate text-xs">
            <span className="text-muted-foreground">{label}:</span> <span className="font-medium">{display}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1" align="start">
        <div className="max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const isSel = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
              >
                <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", isSel ? "bg-primary border-primary" : "border-border")}>
                  {isSel && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
