import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Prismic from '@prismicio/client';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Head from 'next/head';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { Comments } from '../../components/Comments';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  updatedAt: string;
  prev_page: {
      slug: string | null;
      title: string | null;
  };
  next_page: {
      slug: string | null;
      title: string | null;
  };
}

export default function Post(props: PostProps) {
    const { post, preview, updatedAt, prev_page, next_page } = props;
    const router = useRouter();
    let commentBox = useRef<HTMLDivElement>();
  
    if (router.isFallback) {
        return <div>Carregando...</div>
    }

    const bodyLettersCounts = post.data.content.reduce((total, content) => {
        let letterCounter = RichText.asText(content.body)
        const letterCounterFormatted = letterCounter.split(/[- @!#$%^&*()/\\]/)

        return total + letterCounterFormatted.length
    }, 0)

    const postReadTime = Math.ceil(bodyLettersCounts / 200)

    useEffect(() => {
        let script = document.createElement("script");
        script.async = true;
        script.src = 'https://utteranc.es/client.js';
        script.setAttribute("crossorigin","anonymous");
        script.setAttribute("repo", "bruno-nakahara/Ignite-desafio05");
        script.setAttribute("issue-term", "pathname");
        script.setAttribute( "label", "💬");
        script.setAttribute( "theme", "github-dark-orange");

        if (commentBox && commentBox.current) {
            commentBox.current.appendChild(script);
        } else {
          console.log(`Error adding utterances comments on: ${commentBox}`);
        }

    }, [commentBox])
    
    return (
        <>
            <Head>
                <title>{post.data.title} | spacetravering</title>
            </Head>

            <img className={styles.banner} src={post.data.banner.url} alt={post.data.title} />

            <main className={commonStyles.container}>    
                <div className={styles.postContainer}>
                    <div className={styles.postTitle}>
                        <h1>{post.data.title}</h1>               
                    </div>
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
                    <div className={styles.postReadTime}>
                        <FiClock size={15} />
                        <p>{String(postReadTime)} min</p>
                    </div>
                </div>

                <div className={styles.updatedPostTime}>
                    {updatedAt && (
                        format(new Date(updatedAt), "'* editado em 'd MMM yyyy', às 'HH:mm", { locale: ptBR, })
                    )}
                </div>
                
                
                {post.data.content.map((content) => ( 
                    <div key={content.heading}>
                        <div className={styles.contentHeading} dangerouslySetInnerHTML={{ __html: content.heading }} />
                        <div className={styles.contentBody} dangerouslySetInnerHTML={{ __html: RichText.asText(content.body) }} />
                    </div> 
                ))}

                <div className={styles.divisor}></div>

                <div className={styles.linksToOtherPages}>
                    <div className={styles.previousPage}>
                        <p>{prev_page.title}</p>
                        { prev_page.slug && (
                            <Link href={`/post/${prev_page.slug}`}>
                                <a>Post anterior</a>
                            </Link>
                        )}
                    </div>
                    <div className={styles.nextPage}>
                        <p>{next_page.title}</p>
                        { next_page.slug && (
                            <Link href={`/post/${next_page.slug}`}>
                                <a>Próximo post</a>
                            </Link>
                        )}
                    </div>
                </div>

                <Comments commentBox={commentBox} />      

                {preview && (
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

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
  );
  
  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
      paths,
      fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async ({ preview = false, previewData, params }) => {
    const { slug } = params;
    let postIndex = 0;

    const prismic = getPrismicClient();
    const response = await prismic.query(
        Prismic.predicates.at('document.type', 'posts'),
        {
            ref: previewData?.ref ?? null,
        }
    )

    const posts = response.results.map((post, index) => {   
        if (post.uid == slug) {
            postIndex = index;

            return {
                uid: post.uid,
                first_publication_date: post.first_publication_date,
                data: {
                    title: post.data.title,
                    subtitle: post.data.subtitle,
                    banner: {
                        url: post.data.banner.url,
                    },
                    author: post.data.author,
                    content: post.data.content
                }
            } 
        }        
    })
    
    return {
        props: {
            post: posts[postIndex], 
            preview,
            updatedAt: response.results[postIndex].last_publication_date,
            next_page: { slug: response.results[postIndex + 1]?.uid ?? null, title: response.results[postIndex + 1]?.data.title ?? null },
            prev_page: { slug: response.results[postIndex - 1]?.uid ?? null, title: response.results[postIndex - 1]?.data.title ?? null }
        },
        revalidate: 60 * 30,//30 minutes
    }
};
