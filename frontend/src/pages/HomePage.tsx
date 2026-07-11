import { Link } from "react-router-dom";
import { Music2, TrendingUp, Target, School, User, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";

export function HomePage() {
	return (
		<div className="min-h-screen">
			{/* Hero Section */}
			<section className="relative py-20 px-4 bg-gradient-to-br from-primary/20 via-background to-brass/20">
				<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQgOC4wNi0xOCAxOC0xOCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-40" />
				<div className="container mx-auto max-w-6xl relative z-10">
					<div className="text-center space-y-6 animate-fade-in">
						<h1 className="text-5xl md:text-7xl font-bold leading-tight text-balance">
							Master Music <span className="text-primary">Sight Reading</span>
						</h1>
						<p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
							The customizable platform for music students, teachers, and
							performers to practice sight reading and note recognition
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
							<Link to="/note-game">
								<Button size="xl" className="w-full sm:w-auto">
									<Music2 className="mr-2 h-5 w-5" />
									Start Practicing Now
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 px-4">
				<div className="container mx-auto max-w-6xl">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<Card className="group hover:border-primary hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<Music2 className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Note Recognition Game</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Interactive games that help you identify notes quickly and
									accurately. Track your speed and accuracy in real-time.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="group hover:border-primary hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-brass/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<Target className="h-6 w-6 text-brass" />
								</div>
								<CardTitle>Rhythm Practice</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Customizable exercises focusing on specific rhythm patterns.
									Perfect for UIL preparation and auditions.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="group hover:border-primary hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<TrendingUp className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Track Progress</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Detailed analytics showing your improvement over time. Set
									goals and celebrate your musical growth.
								</CardDescription>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="py-20 px-4 bg-muted/30">
				<div className="container mx-auto max-w-4xl">
					<h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
					<div className="space-y-8">
						{[
							{
								step: 1,
								title: "Choose Your Exercise",
								description:
									"Select from note games, rhythm practice, or custom exercises tailored to your needs.",
							},
							{
								step: 2,
								title: "Practice & Learn",
								description:
									"Work through exercises tailored to your skill level and goals with immediate feedback.",
							},
							{
								step: 3,
								title: "Track Improvement",
								description:
									"View your progress and celebrate your musical growth with detailed analytics.",
							},
						].map((item) => (
							<div key={item.step} className="flex gap-6 items-start">
								<div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
									{item.step}
								</div>
								<div className="flex-1">
									<h3 className="text-2xl font-bold mb-2">{item.title}</h3>
									<p className="text-muted-foreground text-lg">
										{item.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Built For Everyone Section */}
			<section className="py-20 px-4">
				<div className="container mx-auto max-w-6xl">
					<h2 className="text-4xl font-bold text-center mb-12">
						Built For Everyone
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<Card className="hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
									<School className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Music Teachers</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Create custom exercises, track student progress, and assign
									practice sessions. Perfect for classroom and individual
									instruction.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-brass/10 flex items-center justify-center mb-4">
									<User className="h-6 w-6 text-brass" />
								</div>
								<CardTitle>Students</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Build sight-reading confidence for auditions, competitions,
									and UIL practice. Work at your own pace and track your
									improvement.
								</CardDescription>
							</CardContent>
						</Card>

						<Card className="hover:shadow-lg transition-all">
							<CardHeader>
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
									<Users className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>Musicians</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									Advanced practice for specific chord structures, scale
									patterns, and complex rhythms. Take your skills to the next
									level.
								</CardDescription>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Final CTA Section */}
			<section className="py-20 px-4 bg-gradient-to-br from-primary/10 to-brass/10">
				<div className="container mx-auto max-w-4xl text-center space-y-6">
					<h2 className="text-4xl font-bold">
						Ready to Improve Your Sight Reading?
					</h2>
					<p className="text-xl text-muted-foreground">
						Join students and teachers who are already seeing results
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
						<Link to="/note-game">
							<Button size="lg">
								<Music2 className="mr-2 h-5 w-5" />
								Start Note Game
							</Button>
						</Link>
						<Link to="/sheet-music">
							<Button size="lg" variant="outline">
								<Target className="mr-2 h-5 w-5" />
								Try Rhythm Practice
							</Button>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
