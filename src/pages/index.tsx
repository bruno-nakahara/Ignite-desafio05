import { GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from "react-icons/fi";

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Link from 'next/link';
import { useState } from 'react';


interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home(props: HomeProps): JSX.Element{
  const [pageData, setPageData] = useState<HomeProps>(props)
  const [nextPageRef, setNextPageRef] = useState<string | null>(props.postsPagination.next_page)

  function handleNextPage() {
    getNextPageData(nextPageRef)
  }

  async function getNextPageData(url: string) {
    const getNextPageData = await fetch(url)
      .then(response => response.json())

    const newPost: Post = {
      uid: getNextPageData.results[0].uid,
      first_publication_date: getNextPageData.results[0].first_publication_date,
      data: {
        title: getNextPageData.results[0].data.title,
        subtitle: getNextPageData.results[0].data.subtitle,
        author: getNextPageData.results[0].data.author,
      }
    }

    const nextPostPagination = {
      next_page: getNextPageData.next_page,
      results: [...pageData.postsPagination.results, newPost]
    }

    setNextPageRef(getNextPageData.next_page)
    setPageData({ postsPagination: nextPostPagination })
  }
  
  return (
    <>
      <Head>
        <title>Posts | spacetravering</title>
      </Head>
  
      <main className={commonStyles.container}>
        { pageData.postsPagination.results.map(post => (
          <div key={post.uid} className={styles.postContainer}>
            <div className={styles.postTitle}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <h1>{post.data.title}</h1>
                  <p>{post.data.subtitle}</p>
                </a> 
              </Link>                     
            </div>
            <div className={styles.postInfo}>
              <div className={styles.postDataCreated}>
                <FiCalendar size={15} />
                <p>{format(new Date(post.first_publication_date), "d MMM yyyy", { locale: ptBR, })}</p>
              </div>
              <div className={styles.postAuthor}>
                <FiUser size={15} />
                <p>{post.data.author}</p>
              </div>
            </div>
          </div>
        ))}  

        { nextPageRef ?
          (
            <button type="button" onClick={handleNextPage} className={styles.nextPageButton}>Carregar mais posts</button>
          ) : (
            ""
          )
        }
        
        {props.preview && (
          <aside className={commonStyles.previewButton}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ preview = false, previewData, }) => {
  const prismic = getPrismicClient();
  
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ], {
    fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    pageSize: 1,
    page: 1, 
    ref: previewData?.ref ?? null,
  });
  
  const posts = postsResponse.results.map(post => {  
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      }
    }
  }) 

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page
      },
      preview
    },
    revalidate: 60 * 30,//30 minutes
  }
};
