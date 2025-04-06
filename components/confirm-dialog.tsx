'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import * as React from 'react';

interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void; // Modal kapatmak için
	onConfirm: () => void; // "Evet/Güncelle" tıklayınca çalışacak
	title?: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
}

// Basit bir onay diyaloğu oluşturuyoruz.
export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title = 'Onay',
	description,
	confirmText = 'Güncelle',
	cancelText = 'Vazgeç',
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						{cancelText}
					</Button>
					<Button onClick={onConfirm}>{confirmText}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
