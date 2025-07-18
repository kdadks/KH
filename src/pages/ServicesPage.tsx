import React from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';
import { useNavigate } from 'react-router-dom';
import { treatmentPackages } from '../data/packages';
import SEOHead from '../components/utils/SEOHead';

const ServicesPage: React.FC = () => {
	const navigate = useNavigate();
	return (
		<>
			<SEOHead
				title="Our Services - KH Therapy"
				description="Discover KH Therapy’s range of physiotherapy services, from sports injury rehabilitation to ergonomic assessments. Personalized care for your wellness journey."
				canonicalUrl="/services"
			/>
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
		</>
	);
};

export default ServicesPage;