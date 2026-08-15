import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    title: `Blog — ${t('title')}`,
    description: 'Guides, conseils et actualités sur la reconnaissance de manuscrits arabes et français.',
  }
}

export default function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  const posts = [
    {
      slug: 'ocr-arabe-manuscrit',
      title: locale === 'ar' ? 'كيف يعمل OCR للعربية المخطوطة؟' : 'Comment fonctionne l\'OCR pour l\'arabe manuscrit ?',
      excerpt:
        locale === 'ar'
          ? 'نستعرض تحديات التعرف على الحروف العربية المتصلة والمخطوطة وكيف تتغلب عليها مخطوط.'
          : 'Découvrez les défis de la reconnaissance des caractères arabes connectés et manuscrits, et comment Makhtout les résout.',
    },
    {
      slug: 'numeriser-archives',
      title: locale === 'ar' ? '5 خطوات لأرشفة سجلاتك المخطوطة' : '5 étapes pour archiver vos registres manuscrits',
      excerpt:
        locale === 'ar'
          ? 'دليل عملي لرقمنة الأرشيفات والحفاظ عليها مع إمكانية البحث فيها.'
          : 'Un guide pratique pour numériser vos archives, les préserver et les rendre consultables.',
    },
    {
      slug: 'souverainete-donnees',
      title: locale === 'ar' ? 'لماذا السيادة الرقمية مهمة في الأرشفة؟' : 'Pourquoi la souveraineté des données compte en archivage ?',
      excerpt:
        locale === 'ar'
          ? 'فوائد استضافة الحلول الذكية محلياً دون الاعتماد على خدمات السحابة الخارجية.'
          : 'Les avantages d\'héberger vos solutions IA en local sans dépendre de services cloud étrangers.',
    },
  ]

  return (
    <div className="container py-12">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === 'ar' ? 'العودة إلى الرئيسية' : 'Retour à l\'accueil'}
        </Button>
      </Link>

      <h1 className="mb-6 text-3xl font-bold">
        {locale === 'ar' ? 'مدونة مخطوط' : 'Blog Makhtout'}
      </h1>
      <p className="mb-10 max-w-2xl text-muted-foreground">
        {locale === 'ar'
          ? 'أدلة ونصائح وأخبار حول التعرف على المخطوطات العربية والفرنسية.'
          : 'Guides, conseils et actualités sur la reconnaissance de manuscrits arabes et français.'}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="mb-3 text-xl font-semibold">{post.title}</h2>
            <p className="text-sm text-muted-foreground">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
