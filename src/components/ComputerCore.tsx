import type { FC } from "react";
import styles from "../../styles/lcars.module.css";

const ComputerCore: FC = () => {
  return (
    <div className={styles.computerCoreButton}>
      <button onClick={() => alert("Computer Core Accessed 🚀")}>
        Computer Core
      </button>
    </div>
  );
};

export default ComputerCore;
