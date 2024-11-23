import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../firebase";
import { createPortal } from "react-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

function App() {
  const [dbData, setDbData] = useState([]);
  const [userUid, setUserUid] = useState<string | null>();
  const [willChangeName, setWillChangeName] = useState("");
  const [userName, setUserName] = useState("");
  const [nowPoint, setNowPoint] = useState<number | null>(null);
  const [highestPoint, setHighestPoint] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isClockWise, setIsClockWise] = useState(false);
  const [count, setCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const hitCircleRef = useRef<HTMLDivElement | null>(null);

  const check = (
    elm1: React.MutableRefObject<HTMLDivElement | null>,
    elm2: React.MutableRefObject<HTMLDivElement | null>
  ) => {
    const d1 = elm1.current!.getBoundingClientRect();
    const d2 = elm2.current!.getBoundingClientRect();
    return !(
      d1.top > d2.bottom ||
      d1.right < d2.left ||
      d1.bottom < d2.top ||
      d1.left > d2.right
    );
  };

  const setHitCircleArea = () => {
    const radius = container.current!.offsetWidth / 2;
    const a = Math.floor(Math.random() * 361);
    const a2 = (a - 90) * (Math.PI / 180);
    const x = Math.cos(a2) * radius * 0.83;
    const y = Math.sin(a2) * radius * 0.83;
    hitCircleRef.current?.style.setProperty("translate", `${x}px ${y}px`);
  };

  const handleKeyDown = (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      setShowModal(false);

      if (isPlaying === false && count === 0) {
        setIsPlaying(true);
        setHitCircleArea();
        return;
      }

      if (check(barRef, hitCircleRef)) {
        setCount((prev) => prev + 1);
        setIsClockWise((prev) => !prev);
        setHitCircleArea();
      } else {
        setNowPoint(count);
        setShowModal(true);
        setIsPlaying(false);

        if (!highestPoint || highestPoint < count) {
          console.log(highestPoint, count);
          console.log("Updating high score");
          const newHighScore = count;
          setHighestPoint(newHighScore);
          registerHighScore(newHighScore);
          registerDbData();
        }
        setCount(0);
      }
    }
  };

  const registerDbData = async () => {
    const docRef = doc(db, "users", auth.currentUser?.uid);
    const docSnap = await getDoc(docRef);
    setDbData([docSnap.data()]);
    return { docRef, docSnap };
  };

  const registerHighScore = async (highscore: number) => {
    const userRef = doc(db, "users", userUid);
    await updateDoc(userRef, {
      highScore: highscore,
    });
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, count, barRef, hitCircleRef, nowPoint, highestPoint]);

  useEffect(() => {
    const register = async () => {
      await signInAnonymously(auth).then((user) => {
        console.log("auth");
        setUserUid(user.user.auth.currentUser.uid);
      });

      const { docRef, docSnap } = await registerDbData();

      console.log(docSnap.data());

      // db登録
      if (docSnap.exists()) {
        console.log("すでに登録済み");
        setUserName(docSnap.data().name);
      } else {
        await setDoc(doc(db, "users", auth.currentUser?.uid), {
          name: "guest",
          highScore: 0,
        });
      }
    };
    register();
  }, []);

  useGSAP(
    () => {
      const duration = Math.min(5 / (count * 0.2), 2.5);
      if (isPlaying) {
        gsap.to(barRef.current, {
          rotate: isClockWise ? "+=360" : "-=360",
          duration: duration,
          repeat: -1,
          ease: "linear",
        });
      } else {
        gsap.killTweensOf(barRef.current);
      }
    },
    { scope: container, dependencies: [barRef, isPlaying, isClockWise, count] }
  );

  const onClickRegister = async () => {
    setUserName(willChangeName);
    const userRef = doc(db, "users", userUid);
    await updateDoc(userRef, {
      name: willChangeName,
    });
  };
  return (
    <div className="bg-gray-600 min-h-screen p-5">
      <h1 className="font-bold text-3xl text-sky-50 text-center">
        POP THE ROCK JACKPOT
      </h1>
      <div className="container mx-auto p-10 max-w-3xl">
        <div className="wrapper">
          <div className="circle bg-sky-400 w-full aspect-square rounded-full mx-auto grid place-items-center">
            <div
              ref={container}
              className="circle__bar-area w-4/5 bg-sky-950 aspect-square rounded-full relative"
            >
              <div
                ref={hitCircleRef}
                className="circle__hitbox z-10 grid place-items-center rounded-full bg-yellow-400 w-1/12 aspect-square absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 before:w-[200%] before:aspect-square before:bg-yellow-200 before:-z-10 before:block before:relative before:rounded-full"
              ></div>
              <div
                ref={barRef}
                className="circle__bar absolute z-10 bg-red-700 w-3 h-1/2 block rounded-[50%] origin-bottom left-1/2 -translate-x-1/2"
              ></div>
              <div className="circle__number-area w-8/12 z-20 bg-sky-600 aspect-square rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center">
                <p className="text-center">
                  <span className="font-bold text-8xl text-white block">
                    {count}
                  </span>
                  {count === 0 && isPlaying === false && (
                    <span className="text-white text-2xl">
                      Press Space To Start
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p>黄色の丸のとこでスペースを押してください</p>
      <p>だんだん早くなります</p>

      <div>
        <p>登録名：{userName}さん</p>
      </div>

      <div>
        <label>
          登録名変更:
          <input
            type="text"
            placeholder="登録名"
            value={willChangeName}
            className="p-2"
            onChange={(e) => setWillChangeName(e.target.value)}
          />
          <button
            onClick={onClickRegister}
            className="bg-black text-white rounded p-2"
          >
            登録
          </button>
        </label>
      </div>

      <table>
        <tbody>
          <tr>
            <th className="p-2 text-center">順位</th>
            <th className="p-2 text-center">登録名</th>
            <th className="p-2 text-center">最高点</th>
          </tr>
          {dbData.map((data, i) => (
            <tr key={i}>
              <td className="px-2 text-center">{i + 1}</td>
              <td className="px-2 text-center">{data.name}</td>
              <td className="px-2 text-center">{data.highScore}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul></ul>

      {showModal &&
        createPortal(
          <div className="text-center fixed inset-0 bg-black bg-opacity-50 z-50 grid place-items-center">
            <div className="bg-white w-10/12 mx-auto p-10">
              <p className="text-lg">おめでとう、今の記録は {nowPoint} です</p>
              <button onClick={() => setShowModal(false)}>close</button>
            </div>
            <ul>
              {dbData.map((data, i) => (
                <li key={i}>
                  {data.name} : {data.highScore}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

export default App;
