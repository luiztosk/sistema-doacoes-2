import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/react-app/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/react-app/components/ui/select";

/**
 * A paginação do ledger é **do servidor**: é a única tabela que cresce sem
 * limite, porque um histórico de movimentos tem uma linha por operação, para
 * sempre. O resto das telas recebe a tabela inteira e filtra no cliente.
 */
type ServerPaginationProps = {
	page: number;
	pageSize: number;
	total: number;
	totalLabel: string;
	pageSizes?: readonly number[];
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
};

export function ServerPagination({
	page,
	pageSize,
	total,
	totalLabel,
	pageSizes = [10, 20, 50, 100],
	onPageChange,
	onPageSizeChange,
}: ServerPaginationProps) {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const first = total === 0 ? 0 : page * pageSize + 1;
	const last = Math.min(total, (page + 1) * pageSize);

	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<p className="text-sm text-muted-foreground">
				{first === 0
					? `Nenhum ${totalLabel}`
					: `${first}–${last} de ${total}`}
			</p>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<label
						htmlFor="ledger-page-size"
						className="text-sm text-muted-foreground"
					>
						Linhas por página
					</label>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => onPageSizeChange(Number(value))}
					>
						<SelectTrigger id="ledger-page-size" className="w-20">
							<SelectValue placeholder={`${pageSize}`} />
						</SelectTrigger>
						<SelectContent>
							{pageSizes.map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<p className="text-sm font-medium">
					Página {page + 1} de {pageCount}
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Página anterior"
						disabled={page === 0}
						onClick={() => onPageChange(page - 1)}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 shrink-0" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						aria-label="Próxima página"
						disabled={page + 1 >= pageCount}
						onClick={() => onPageChange(page + 1)}
					>
						<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0" />
					</Button>
				</div>
			</div>
		</div>
	);
}
