import React, { useState, useEffect, useMemo } from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package } from '../data/packages'; // Only import the type
import { supabase } from '../supabaseClient';
import SEOHead from '../components/utils/SEOHead';
import { formatPrice } from '../utils/priceFormatter';

const ServicesPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [services, setServices] = useState<Package[]>([]);
	const [categories, setCategories] = useState<string[]>([]);
	const [activeCategory, setActiveCategory] = useState<string>('');
	const [loading, setLoading] = useState(true);

	// Helper functions for URL-friendly category names
	const categoryToSlug = (category: string): string => {
		return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	};

	const slugToCategory = (slug: string): string => {
		// Map common slugs back to category names
		const slugMap: { [key: string]: string } = {
			'corporate-packages': 'Corporate Packages',
			'corporate-package': 'Corporate Packages',
			'individual-therapy': 'Individual',
			'individual': 'Individual',
			'rehab-fitness': 'Rehab & Fitness',
			'rehab-&-fitness': 'Rehab & Fitness',
			'rehab': 'Rehab & Fitness',
			'packages': 'Packages',
			'classes': 'Classes',
			'sports-therapy': 'Sports Therapy',
			'group-sessions': 'Group Sessions',
			'online-session': 'Online Session',
			'online-sessions': 'Online Session',
			'online': 'Online Session'
		};
		return slugMap[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	};

	useEffect(() => {
		fetchServices();
	}, []);

	// Set active category from URL parameter or default to first category
	useEffect(() => {
		if (categories.length === 0) return; // Wait for categories to load

		const categoryParam = searchParams.get('category');
		if (categoryParam) {
			// Try to set category from URL
			const categoryName = slugToCategory(categoryParam);
			if (categories.includes(categoryName)) {
				if (activeCategory !== categoryName) {
					setActiveCategory(categoryName);
				}
				return;
			}
		}
		
		// If no URL param or invalid category, set the first category as active
		if (!activeCategory || !categories.includes(activeCategory)) {
			setActiveCategory(categories[0]);
		}
	}, [searchParams, categories]); // Removed activeCategory from dependencies to avoid loops

	const fetchServices = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from('services')
				.select('id, name, category, price, in_hour_price, out_of_hour_price, features, booking_type, visit_type, is_active')
				.eq('is_active', true)
				.order('name');

			if (error) {
				console.error('Error fetching services:', error);
				return;
			}

			// Transform database services to Package format
			const transformedServices: Package[] = data?.map(service => {
				// Ensure categories is always an array
				let categoriesArray: string[] = [];
				if (Array.isArray(service.category)) {
					categoriesArray = service.category;
				} else if (service.category) {
					categoriesArray = [service.category];
				}

				return {
					name: service.name,
					categories: categoriesArray,
					category: categoriesArray[0] || undefined, // Keep for backward compatibility
					price: service.price || undefined,
					inHourPrice: service.in_hour_price || undefined,
					outOfHourPrice: service.out_of_hour_price || undefined,
					features: service.features || [],
					bookingType: service.booking_type || 'book_now',
					visitType: service.visit_type || 'clinic',
				};
			}) || [];

			setServices(transformedServices);

			// Get unique categories from the data (flatten all categories from arrays)
			const allCategories = transformedServices.flatMap(service => service.categories);
			
			const uniqueCategories = Array.from(new Set(allCategories))
				.filter(Boolean) // Remove any null/undefined categories
				.sort((a, b) => {
					// Custom sort order: Packages → Individual → Rehab & Fitness → Corporate Packages → Classes → Online Session
					const order = ['Packages', 'Individual', 'Rehab & Fitness', 'Corporate Packages', 'Classes', 'Online Session'];
					
					// Function to find the best match for a category
					const findOrderIndex = (category: string): number => {
						const cat = category.toLowerCase();
						
						// Exact matches first
						const exactIndex = order.findIndex(orderCat => orderCat.toLowerCase() === cat);
						if (exactIndex !== -1) return exactIndex;
						
						// Partial matches with specific logic
						if (cat.includes('package') && !cat.includes('corporate')) return 0; // Packages
						if (cat.includes('individual') || cat.includes('therapy')) return 1; // Individual
						if (cat.includes('rehab') || cat.includes('fitness')) return 2; // Rehab & Fitness
						if (cat.includes('corporate')) return 3; // Corporate Packages
						if (cat.includes('class')) return 4; // Classes
						if (cat.includes('online') || cat.includes('session')) return 5; // Online Session
						
						return -1; // Not found
					};
					
					const indexA = findOrderIndex(a);
					const indexB = findOrderIndex(b);
					
					// If both categories are in the predefined order, sort by their index
					if (indexA !== -1 && indexB !== -1) {
						return indexA - indexB;
					}
					// If only one is in the predefined order, prioritize it
					if (indexA !== -1) return -1;
					if (indexB !== -1) return 1;
					// If neither is in the predefined order, sort alphabetically
					return a.localeCompare(b);
				});

			setCategories(uniqueCategories);
		} catch (error) {
			console.error('Error fetching services:', error);
		} finally {
			setLoading(false);
		}
	};

	// Handle tab click with URL update
	const handleCategoryClick = (category: string) => {
		console.log('Tab clicked:', category); // Debug log
		setActiveCategory(category);
		const slug = categoryToSlug(category);
		navigate(`/services?category=${slug}`, { replace: true });
	};

	// Memoize filtered services to ensure proper re-calculation
	const filtered = useMemo(() => {
		console.log('Filtering services for category:', activeCategory);
		return services.filter((p) => {
			// Ensure we have a valid categories array
			const serviceCategories = p.categories || [];
			
			// Check if service has the active category
			const categoryMatch = serviceCategories.includes(activeCategory);
			if (!categoryMatch) return false;
			
			// Additional filter: if category is "Online Session", only show services with visit_type = "online"
			if (activeCategory === 'Online Session' && p.visitType !== 'online') {
				return false;
			}
			
			return true;
		});
	}, [services, activeCategory]);

	return (
		<>
			<SEOHead
				title="Our Services - KH Therapy"
				description="Discover KH Therapy's range of physiotherapy services, from sports injury rehabilitation to wellness assessments. Personalized care for your wellness journey."
				canonicalUrl="/services"
			/>
			<main className="py-8">
				<Container>
					<SectionHeading
						title="Our Services"
						subtitle="Comprehensive solutions tailored to your needs"
					/>
					{/* Tabs */}
					<div className="mt-10 overflow-x-auto">
						<ul className="flex gap-3 border-b pb-2 min-w-max">
							{categories.map((cat) => {
								const isActive = cat === activeCategory;
								return (
									<li key={cat}>
										<button
											className={`px-4 py-2 rounded-t text-sm font-medium whitespace-nowrap transition border ${
												isActive
													? 'bg-[#71db77] text-white border-[#71db77]'
													: 'bg-neutral-100 hover:bg-neutral-200 border-transparent'
											}`}
											onClick={() => handleCategoryClick(cat)}
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
									<h2 className="text-xl font-semibold mb-2">{pkg.name}</h2>								{pkg.visitType && (
									<div className="mb-3">
										<span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-700">
											{pkg.visitType === 'clinic' && '🏥 Clinic'}
											{pkg.visitType === 'home' && '🏠 Home'}
											{pkg.visitType === 'online' && '💻 Online'}
										</span>
									</div>
								)}									<div className="text-primary-600 mb-4 space-y-1">
										{pkg.inHourPrice && (
											<div className="text-lg font-semibold">
												In Hours: <span>{formatPrice(pkg.inHourPrice)}</span>
											</div>
										)}
										{pkg.outOfHourPrice && (
											<div className="text-lg font-semibold">
												Out of Hours: <span>{formatPrice(pkg.outOfHourPrice)}</span>
											</div>
										)}
										{!pkg.inHourPrice && !pkg.outOfHourPrice && pkg.price && (
											<div className="text-2xl font-bold">{formatPrice(pkg.price)}</div>
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
										className="bg-[#71db77] text-white px-4 py-2 rounded hover:bg-[#5fcf68] transition mt-auto"
										onClick={() => {
											if (pkg.bookingType === 'contact_me') {
												navigate('/contact');
											} else {
												navigate('/booking');
											}
										}}
									>
										{pkg.bookingType === 'contact_me' ? 'Contact Me' : 'Book Now'}
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
