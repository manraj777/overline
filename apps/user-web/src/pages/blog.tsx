import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, BookOpen, Tag } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { SeoHead } from '@/components/seo/SeoHead';

const BlogPage = () => {
  const posts = [
    {
      id: 1,
      title: 'The Art of the Perfect Grooming Experience',
      excerpt: "Discover why a professional shave is more than just maintenance—it's a ritual of self-care and precision.",
      category: 'Lifestyle',
      date: 'Oct 12, 2023',
      readTime: '5 min read',
      image: '/grooming_lifestyle_hero_1775918818988.png'
    },
    {
      id: 2,
      title: 'Our Commitment to Your Privacy',
      excerpt: "In a digital world, your data is your identity. Learn how Overline uses advanced encryption to keep your bookings private.",
      category: 'Platform',
      date: 'Oct 10, 2023',
      readTime: '4 min read',
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: 3,
      title: 'Top 5 Grooming Trends for 2024',
      excerpt: "From beard styles to skincare routines, see what experts are predicting for the year ahead.",
      category: 'Trends',
      date: 'Oct 08, 2023',
      readTime: '6 min read',
      image: 'https://images.unsplash.com/photo-1503910368127-b08839074712?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div className="min-h-screen bg-surface">
      <SeoHead
        title="The Overline Journal — Grooming, Wellness & Booking Trends"
        description="Stories, guides, and platform updates from the Overline team. Grooming tips, wellness trends, and how we build a better booking experience for India."
        canonical="/blog"
        ogType="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'The Overline Journal',
          url: 'https://overline.in/blog',
          publisher: {
            '@type': 'Organization',
            name: 'Overline',
            logo: { '@type': 'ImageObject', url: 'https://overline.in/overline-logo.png' },
          },
          blogPost: posts.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            image: p.image,
            author: { '@type': 'Organization', name: 'Overline' },
          })),
        }}
      />

      {/* Hero Header */}
      <section className="pt-32 pb-20 px-6 lg:px-8 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-top-left" />
         <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Overline Chronicles</span>
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-8 text-on-surface">
              Stories of <br/>
              <span className="text-primary italic">Style & Tech</span>
            </h1>
            <p className="text-xl text-on-surface-variant max-w-2xl leading-relaxed">
              Exploring the intersection of premium grooming and seamless technology. Your guide to the Overline ecosystem.
            </p>
         </div>
      </section>

      {/* Blog Feed */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-6 shadow-lg shadow-black/5 group-hover:shadow-xl transition-all duration-500">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4">
                     <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-primary border border-primary/10">
                        {post.category}
                     </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">
                     <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                     <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-on-surface leading-tight tracking-tight group-hover:text-primary transition-colors duration-300">
                    {post.title}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed line-clamp-3 font-medium">
                    {post.excerpt}
                  </p>
                  <Button variant="ghost" className="p-0 h-auto group-hover:gap-4 flex items-center gap-3 text-primary font-black transition-all">
                    READ ARTICLE <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-6 lg:px-8">
         {/* Stable dark CTA in both themes — bg-inverse-surface flipped to
             white in dark mode and made the text invisible. Use literal
             neutrals + a brand-tinted glow so the panel always reads as a
             premium dark card. */}
         <div className="max-w-7xl mx-auto rounded-5xl bg-neutral-950 p-12 md:p-24 text-center relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
            <span className="relative text-primary font-black uppercase tracking-widest text-xs mb-6 block">Stay Ahead</span>
            <h2 className="relative text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-tight">
               Want the latest stories <br/> delivered to you?
            </h2>
            <div className="relative max-w-md mx-auto flex flex-col sm:flex-row gap-3">
               <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
               />
               <Button className="rounded-2xl bg-white text-black font-black px-10 py-4 hover:bg-white/90 active:scale-95 transition-all">
                  JOIN US
               </Button>
            </div>
         </div>
      </section>
    </div>
  );
};

export default BlogPage;
