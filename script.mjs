import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

const firebaseConfig = {
	apiKey: "AIzaSyCbO6a1EGhypeiqqfEj0s2m37yPlDkGNsQ",
	authDomain: "pupsblog-c7874.firebaseapp.com",
	databaseURL: "https://pupsblog-c7874-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "pupsblog-c7874",
	storageBucket: "pupsblog-c7874.firebasestorage.app",
	messagingSenderId: "499178630636",
	appId: "1:499178630636:web:034f1bc044488c2602e4c9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app); // Экспортируем базу данных

// Ссылка на коллекцию постов
const postsRef = ref(database, "posts");

// Функция для добавления поста
function addPost(image, text) {
  // Создаём новую запись в базе данных
  const newPostRef = push(postsRef);

  // Устанавливаем данные в новую запись
  set(newPostRef, {
    image: image,
    text: text,
    date: new Date().toLocaleString(),
  })
    .then(() => {
      console.log("Пост успешно добавлен!");
      closeModal("modal-add-post");
    })
    .catch((error) => {
      console.error("Ошибка при добавлении поста:", error);
    });
}


// Функция для загрузки постов
function loadPosts() {
  onValue(
    postsRef,
    (snapshot) => {
      const postsContainer = document.getElementById("post-container");
      postsContainer.innerHTML = ""; // Очищаем контейнер перед загрузкой

      const data = snapshot.val();
      if (data) {
        Object.values(data).forEach((post) => {
          renderPost(post.image, post.text, post.date);
        });
      }
    },
    (error) => {
      console.error("Ошибка при загрузке постов:", error);
    }
  );
}

// Функция рендеринга одного поста
function renderPost(image, text, date) {
  const container = document.getElementById("post-container");
  const postElement = document.createElement("div");
  postElement.className = "post";

  postElement.innerHTML = `
    <img src="${image}" alt="Картинка поста">
    <div class="post-content">
      <p class="post-text">${text}</p>
      <p class="post-date">${date}</p>
    </div>
  `;

  container.appendChild(postElement);
}

// Обработчики событий
document.getElementById("save-post-btn").addEventListener("click", () => {
  const fileInput = document.getElementById("post-image");
  const textInput = document.getElementById("post-text");

  if (fileInput.files.length > 0 && textInput.value.trim() !== "") {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageBase64 = e.target.result;
      addPost(imageBase64, textInput.value);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    alert("Пожалуйста, выберите изображение и введите описание!");
  }
});

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
  } else {
    console.error(`Модальное окно с ID "${modalId}" не найдено.`);
  }
}

document.getElementById("add-post-btn").addEventListener("click", () => {
  document.getElementById("modal-add-post").classList.remove("hidden");
});

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("modal-add-post").classList.add("hidden");
});

// Загружаем посты при старте
loadPosts();
