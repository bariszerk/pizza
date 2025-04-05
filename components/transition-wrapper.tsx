'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function TransitionWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	useEffect(() => {
		console.log('TransitionWrapper mounted with key:', pathname);
	}, [pathname]);

	return (
		<AnimatePresence mode="sync">
			<motion.div
				key={pathname}
				initial={{ opacity: 0, x: 50 }}
				animate={{ opacity: 1, x: 0 }}
				// exit={{ opacity: 0, x: -50 }} causes page to animate two times
				transition={{ duration: 0.3 }}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}
