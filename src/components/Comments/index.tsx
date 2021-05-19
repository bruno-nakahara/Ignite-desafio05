import styles from './comments.module.scss';

export const Comments = ({ commentBox }) => (
    <div ref={commentBox} className={styles.commentsBox}></div>
)