'use client';
import { TopNavbar } from '@/components/navbar-top';
import TransitionWrapper from '@/components/transition-wrapper';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { useAutoSignOut } from '@/hooks/auto-sign-out';
import './globals.css';
import { usePathname } from 'next/navigation';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	useAutoSignOut(10);

	const pathname = usePathname();

    const noNavPaths = ['/login', '/signup', '/forgot-password', '/update-password', '/verify-email'];

	 const showNavbar = !noNavPaths.includes(pathname);

	return (
		<html lang="tr" suppressHydrationWarning>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					{showNavbar && <TopNavbar />}
					<main className="container mx-auto">
						<TransitionWrapper>{children}</TransitionWrapper>
					</main>
					<Toaster richColors position="top-right" /> {/* Toaster eklendi */}
				</ThemeProvider>
			</body>
		</html>
	);
}
