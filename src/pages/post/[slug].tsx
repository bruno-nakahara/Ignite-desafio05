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
import { useEffect } from 'react';

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
}

export default function Post(props: PostProps) {
    const { post } = props
    const router = useRouter()

    if (router.isFallback) {
        return <div>Carregando...</div>
    }

    const bodyLettersCounts = post.data.content.reduce((total, content) => {
        let letterCounter = RichText.asText(content.body)
        const letterCounterFormatted = letterCounter.split(/[- @!#$%^&*()/\\]/)

        return total + letterCounterFormatted.length
    }, 0)

    const postReadTime = Math.ceil(bodyLettersCounts / 200)

    // useEffect(() => {
    //     let script = document.createElement("script");
    //     let anchor = document.getElementById("inject-comments-for-uterances");
    //     script.src = "https://utteranc.es/client.js";
    //     script.setAttribute("crossorigin","anonymous");
    //     script.async = true;
    //     script.setAttribute("repo", "https://github.com/bruno-nakahara/Ignite-desafio05.git");
    //     script.setAttribute("issue-term", "pathname");
    //     script.setAttribute( "theme", "github-dark-orange");
    //     anchor.appendChild(script);
    // }, [])

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
                
                {post.data.content.map((content) => ( 
                    <div key={content.heading}>
                        <div className={styles.contentHeading} dangerouslySetInnerHTML={{ __html: content.heading }} />
                        <div className={styles.contentBody} dangerouslySetInnerHTML={{ __html: RichText.asText(content.body) }} />
                    </div> 
                ))}
            </main>

            <script src="https://utteranc.es/client.js"
                    repo="[https://github.com/bruno-nakahara/Ignite-desafio05.git]"
                    issue-term="pathname"
                    theme="github-dark-orange"
                    label="Comment"
                    crossorigin="anonymous"
                    async>
            </script>
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

export const getStaticProps: GetStaticProps = async context => {
    const { slug } = context.params

    const prismic = getPrismicClient();
    const response = await prismic.getByUID('posts', String(slug), {});
    
    
    const post = {
        uid: response.uid,
        first_publication_date: response.first_publication_date,
        data: {
            title: response.data.title,
            subtitle: response.data.subtitle,
            banner: {
                url: response.data.banner.url,
            },
            author: response.data.author,
            content: response.data.content
        }
    }
    
    return {
        props: {
            post
        },
        revalidate: 60 * 30,//30 minutes
    }
};
