import React from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';
import { useNavigate } from 'react-router-dom';

const treatmentPackages = [
	{
		name: 'Basic Wellness',
		price: '€65',
		features: [
			'50 min Consultation',
			'Personalized exercise Plan',
			'1 Follow-up Session',
		],
	},
	{
		name: 'Premium Care',
		price: '€115',
		features: [
			'50 min Consultation',
			'Personalized Diet & Exercise Plan',
			'1 Follow-up Sessions',
			'',
		],
	},
	{
		name: 'Ultimate Health',
		price: '€250',
		features: [
			'50 min Consultation',
			'Comprehensive Health Assessment',
			'4 Follow-up Sessions',
			'',
			'',
		],
	},
	{
		name: 'Sports Massage / Deep Tissue Massage',
		price: '€70',
		features: [
			'60 min session',
			'Relieves muscle tension',
			'Improves flexibility',
		],
	},
	{
		name: 'Pitch Side Cover for Sporting Events',
		price: 'Contact for Quote',
		features: [
			'On-site physiotherapy',
			'Immediate injury management',
			'Support for teams & events',
		],
	},
	{
		name: 'Pre & Post Surgery Rehab',
		price: '€90',
		features: [
			'Personalized rehabilitation plan',
			'Recovery monitoring',
			'Expert guidance',
		],
	},
	{
		name: 'Return to Play/Sport & Strapping & Taping',
		price: '€50',
		features: [
			'Safe return protocols',
			'Strapping & taping techniques',
			'Injury prevention',
		],
	},
	{
		name: 'Corporate Wellness / Workplace Events',
		price: 'Contact for Quote',
		features: [
			'Workplace health workshops',
			'Group exercise sessions',
			'Ergonomic assessments',
		],
	},
];

const ServicesPage: React.FC = () => {
	const navigate = useNavigate();
	return (
		<main className="py-16">
			<Container>
				<SectionHeading
					title="Our Services"
					subtitle="Comprehensive solutions tailored to your needs"
				/>
				<div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					{treatmentPackages.map((pkg) => (
						<div
							key={pkg.name}
							className="border rounded-lg shadow p-6 flex flex-col h-full"
						>
							<h2 className="text-xl font-semibold mb-2">{pkg.name}</h2>
							<div className="text-2xl font-bold text-primary-600 mb-4">
								{pkg.price}
							</div>
							<ul className="mb-6 space-y-2">
								{pkg.features.filter(Boolean).map((feature) => (
									<li key={feature} className="text-neutral-700">
										• {feature}
									</li>
								))}
							</ul>
							<button
								className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition mt-auto"
								onClick={() => navigate('/booking')}
							>
								Book Now
							</button>
						</div>
					))}
				</div>
			</Container>
		</main>
	);
};

export default ServicesPage;