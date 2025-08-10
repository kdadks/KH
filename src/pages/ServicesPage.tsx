import React, { useState } from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';
import { useNavigate } from 'react-router-dom';
import { treatmentPackages, packageCategories, Package } from '../data/packages';
import SEOHead from '../components/utils/SEOHead';

const ServicesPage: React.FC = () => {
	const navigate = useNavigate();
	const [activeCategory, setActiveCategory] = useState<string>(packageCategories[0]);

	const filtered: Package[] = treatmentPackages.filter(
		(p) => p.category === activeCategory
	);
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
					{/* Tabs */}
					<div className="mt-10 overflow-x-auto">
						<ul className="flex gap-3 border-b pb-2 min-w-max">
							{packageCategories.map((cat) => {
								const isActive = cat === activeCategory;
								return (
									<li key={cat}>
										<button
											className={`px-4 py-2 rounded-t text-sm font-medium whitespace-nowrap transition border ${
												isActive
													? 'bg-primary-600 text-white border-primary-600'
												: 'bg-neutral-100 hover:bg-neutral-200 border-transparent'
											}`}
											onClick={() => setActiveCategory(cat)}
										>
											{cat}
										</button>
									</li>
								);
							})}
						</ul>
					</div>

					{/* Packages grid */}
					<div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
						{filtered.map((pkg) => (
							<div
								key={pkg.name}
								className="border rounded-lg shadow p-6 flex flex-col h-full"
							>
								<h2 className="text-xl font-semibold mb-2">{pkg.name}</h2>
								<div className="text-primary-600 mb-4 space-y-1">
									{pkg.inHourPrice && (
										<div className="text-lg font-semibold">
											In Hours: <span>{pkg.inHourPrice}</span>
										</div>
									)}
									{pkg.outOfHourPrice && (
										<div className="text-lg font-semibold">
											Out of Hours: <span>{pkg.outOfHourPrice}</span>
										</div>
									)}
									{!pkg.inHourPrice && !pkg.outOfHourPrice && pkg.price && (
										<div className="text-2xl font-bold">{pkg.price}</div>
									)}
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