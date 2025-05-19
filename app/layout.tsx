'use client';
import { TopNavbar } from '@/components/navbar-top';
import TransitionWrapper from '@/components/transition-wrapper';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { useAutoSignOut } from '@/hooks/auto-sign-out';
import './globals.css';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	useAutoSignOut(10);
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<TopNavbar />
					<main className="container mx-auto p-4">
						<TransitionWrapper>{children}</TransitionWrapper>
					</main>
					<Toaster richColors position="top-right" /> {/* Toaster eklendi */}
				</ThemeProvider>
			</body>
		</html>
	);
}
