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
	onClose: () => void;
	onConfirm: () => void;
	title?: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	children?: React.ReactNode; // Bu satırı ekleyin
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
	children, // children'ı parametre olarak alın
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				{children} {/* children'ı burada render edin */}
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
