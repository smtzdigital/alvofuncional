import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface PlanOption {
  id: string;
  name: string;
  price?: number | null;
}

interface Props {
  plans: PlanOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  showPrice?: boolean;
}

export function PlanCombobox({
  plans,
  value,
  onChange,
  placeholder = "Selecione um plano",
  showPrice = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = plans.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? (
              showPrice && selected.price !== undefined && selected.price !== null ? (
                <>
                  {selected.name} — R$ {Number(selected.price).toFixed(2)}
                </>
              ) : (
                selected.name
              )
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar plano..." />
          <CommandList>
            <CommandEmpty>Nenhum plano encontrado.</CommandEmpty>
            <CommandGroup>
              {plans.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                  {showPrice && p.price !== undefined && p.price !== null
                    ? `${p.name} — R$ ${Number(p.price).toFixed(2)}`
                    : p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
