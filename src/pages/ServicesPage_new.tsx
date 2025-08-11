import React, { useState, useEffect } from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';
import { useNavigate } from 'react-router-dom';
import { packageCategories, Package } from '../data/packages';
import { supabase } from '../supabaseClient';
import SEOHead from '../components/utils/SEOHead';

const ServicesPage: React.FC = () => {
	const navigate = useNavigate();
	const [activeCategory, setActiveCategory] = useState<string>(packageCategories[0]);
	const [services, setServices] = useState<Package[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchServices();
	}, []);

	const fetchServices = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from('services')
				.select('*')
				.eq('is_active', true)
				.order('name');

			if (error) {
				console.error('Error fetching services:', error);
				return;
			}

			// Transform database services to Package format
			const transformedServices: Package[] = data?.map(service => ({
				name: service.name,
				category: service.category,
				price: service.price || undefined,
				inHourPrice: service.in_hour_price || undefined,
				outOfHourPrice: service.out_of_hour_price || undefined,
				features: service.features || [],
			})) || [];

			setServices(transformedServices);
		} catch (error) {
			console.error('Error fetching services:', error);
		} finally {
			setLoading(false);
		}
	};

	const filtered: Package[] = services.filter(
		(p) => p.category === activeCategory
	);

	return (
		<>
			<SEOHead
				title="Our Services - KH Therapy"
				description="Discover KH Therapy's range of physiotherapy services, from sports injury rehabilitation to ergonomic assessments. Personalized care for your wellness journey."
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

					{/* Content */}
					{loading ? (
						<div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3, 4, 5, 6].map((item) => (
								<div key={item} className="border rounded-lg shadow p-6 animate-pulse">
									<div className="h-6 bg-gray-200 rounded mb-4"></div>
									<div className="h-4 bg-gray-200 rounded mb-2"></div>
									<div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
									<div className="space-y-2 mb-6">
										<div className="h-3 bg-gray-200 rounded"></div>
										<div className="h-3 bg-gray-200 rounded"></div>
										<div className="h-3 bg-gray-200 rounded w-5/6"></div>
									</div>
									<div className="h-10 bg-gray-200 rounded"></div>
								</div>
							))}
						</div>
					) : filtered.length === 0 ? (
						<div className="mt-8 text-center text-gray-500">
							<p className="text-lg">No services available in this category.</p>
							<p className="text-sm mt-2">Please check back later or contact us for more information.</p>
						</div>
					) : (
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
					)}
				</Container>
			</main>
		</>
	);
};

export default ServicesPage;
