import { Book, Trophy, Brain, Music2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
	return (
		<div className="min-h-screen py-12 px-4">
			<div className="container mx-auto max-w-4xl space-y-12">
				{/* Mission Statement */}
				<section className="space-y-6 animate-fade-in">
					<h1 className="text-5xl font-bold">About Tremolo</h1>

					<Card className="border-primary/50 shadow-lg">
						<CardHeader>
							<CardTitle className="text-2xl">Our Mission</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 text-lg text-muted-foreground">
							<p>
								Tremolo was born from real classroom experience as a percussion
								director who witnessed a fundamental problem: students were
								memorizing sheet music instead of actually learning to read it.
							</p>
							<p>
								We believe in building genuine skills over memorization tricks.
								That&apos;s why every exercise in Tremolo is dynamically
								generated—no two practice sessions are ever the same. Students
								can&apos;t memorize their way through; they have to actually
								learn to read music.
							</p>
							<p>
								From beginner fundamentals to advanced concepts, Tremolo adapts
								to every skill level. Whether you&apos;re a 6th grader just
								starting your musical journey or a seasoned musician preparing
								for an important audition, we have the tools to help you
								improve.
							</p>
						</CardContent>
					</Card>
				</section>

				{/* For Music Educators */}
				<section className="space-y-6">
					<h2 className="text-4xl font-bold">For Music Educators</h2>

					<div className="space-y-6">
						<div className="flex gap-4 items-start">
							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Book className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1">
								<h3 className="text-2xl font-bold mb-2">
									Real Reading, Not Memorization
								</h3>
								<p className="text-muted-foreground text-lg">
									The biggest challenge in music education is students
									memorizing pieces instead of learning to sight-read. Our
									dynamic exercises prevent memorization by generating unique
									patterns every time, forcing students to engage with actual
									note reading.
								</p>
							</div>
						</div>

						<div className="flex gap-4 items-start">
							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
								<Trophy className="h-6 w-6 text-accent" />
							</div>
							<div className="flex-1">
								<h3 className="text-2xl font-bold mb-2">
									UIL-Focused Practice
								</h3>
								<p className="text-muted-foreground text-lg">
									Tremolo targets specific rhythms and patterns that frequently
									appear in UIL sight reading competitions. Students can
									practice the exact skills they&apos;ll need to succeed in
									competitive settings.
								</p>
							</div>
						</div>

						<div className="flex gap-4 items-start">
							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Brain className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1">
								<h3 className="text-2xl font-bold mb-2">
									Customizable Learning Paths
								</h3>
								<p className="text-muted-foreground text-lg">
									Every student learns differently. Create tailored exercises
									that target specific weaknesses, reinforce strengths, and
									adapt to individual learning speeds and styles.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* For Developing Musicians */}
				<section className="space-y-6">
					<h2 className="text-4xl font-bold">For Developing Musicians</h2>

					<div className="space-y-6">
						<div className="flex gap-4 items-start">
							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Music2 className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1">
								<h3 className="text-2xl font-bold mb-2">
									Advanced Skill Development
								</h3>
								<p className="text-muted-foreground text-lg">
									Work on complex chord structures, challenging scale degree
									jumps, and intricate intervallic patterns. Build the
									sight-reading skills that separate good musicians from great
									ones.
								</p>
							</div>
						</div>

						<div className="flex gap-4 items-start">
							<div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
								<TrendingUp className="h-6 w-6 text-accent" />
							</div>
							<div className="flex-1">
								<h3 className="text-2xl font-bold mb-2">
									Practice What You Need
								</h3>
								<p className="text-muted-foreground text-lg">
									Preparing for an audition? Working on a challenging piece?
									Customize your practice to target exactly what you need. Track
									your progress with detailed analytics and see measurable
									improvement over time.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* Vision Statement */}
				<section className="space-y-6">
					<Card className="border-primary/50 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
						<CardHeader>
							<CardTitle className="text-3xl">The Vision</CardTitle>
						</CardHeader>
						<CardContent className="text-lg text-muted-foreground">
							<p>
								We&apos;re building a comprehensive solution that covers
								everything from beginner fundamentals to advanced concepts.
								Whether you&apos;re a 6th grader learning your first notes or a
								seasoned musician preparing for a professional audition, Tremolo
								will have the tools and exercises you need to succeed.
							</p>
							<p className="mt-4">
								Our goal is simple: make sight-reading practice effective,
								engaging, and accessible to everyone. Real skills. Real
								progress. Real results.
							</p>
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	);
}
