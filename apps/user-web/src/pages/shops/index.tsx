import type { GetServerSideProps } from 'next';

/**
 * /shops/ → redirect to /explore
 *
 * The canonical shop-discovery page is /explore. This redirect prevents
 * /shops/ from 404-ing and consolidates SEO equity on the explore page.
 */
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/explore',
      permanent: true, // 301 — tells crawlers to update their index
    },
  };
};

export default function ShopsIndexPage() {
  // This never renders — getServerSideProps always redirects.
  return null;
}
