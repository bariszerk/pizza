import { TopNavbar } from '@/components/navbar-top';
import TransitionWrapper from '@/components/transition-wrapper';
import { ThemeProvider } from '@/components/ui/theme-provider';
import './globals.css';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<TopNavbar />
					<main className="container mx-auto p-4">
						<TransitionWrapper>{children}</TransitionWrapper>
					</main>
				</ThemeProvider>
			</body>
		</html>
	);
}
