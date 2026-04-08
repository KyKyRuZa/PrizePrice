import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ size = 'medium' }) => {
  return (
    <div className={`${styles.loaderContainer} ${styles[size] || styles.medium}`}>
      <div className={`${styles.spinner} ${styles[size] || styles.medium}`}></div>
    </div>
  );
};

export default Loader;
