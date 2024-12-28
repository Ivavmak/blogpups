import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://huymzjfswngqudqkazyt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eW16amZzd25ncXVkcWthenl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDU4OTgsImV4cCI6MjA1MDg4MTg5OH0.V18YpLMoL8Fr7Hv3LyXfIhzd2y6U9XzRSq8em0ngs30";
const supabase = createClient(supabaseUrl, supabaseKey);

let posts = [];

// Загрузка постов из Supabase и их рендер
async function loadPosts() {
  const loadingElement = document.getElementById("loading");
  loadingElement.classList.remove("hidden");

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;
    
	data.forEach((post) => {
		renderPost(post);
	});
	
  } catch (error) {
    console.error("Ошибка загрузки постов:", error);
  } finally {
    loadingElement.classList.add("hidden");
  }
}

// Рендеринг 1 поста
function renderPost(post) {
  const container = document.getElementById("post-container");
  const postElement = document.createElement("div");
  postElement.className = "post";
  postElement.innerHTML = `
    <img src="${post.image}" alt="Картинка поста" loading="lazy">
    <div class="post-content">
      <p class="post-text">${truncateText(post.description)}</p>
      <p class="post-date">${post.date}</p>
    </div>
  `;
  postElement.addEventListener("click", () => openPostModal(post.image, post.description, post.date));
  container.appendChild(postElement);
}

// Добавление нового поста
async function addPost(image, description) {
  const date = new Date().toLocaleString(); 

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ image, description, date }])
      .select("*");

    if (error) {
      console.error("Ошибка добавления поста:", error.message);
      return;
    }

    console.log("Успешно добавлено:", data);
	
	renderPost(data[0]);
	
    closeModal("modal-add-post");
  } catch (error) {
    console.error("Ошибка добавления поста (catch):", error);
  }
}

// Загрузка изображения в Supabase
async function uploadImage(file) {
  // Генерируем безопасное имя файла
  const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "")}`;

  try {
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(safeFileName, file);

    if (error) throw error;

    // Получаем публичный URL загруженного файла
    const { data: publicData } = supabase.storage
      .from("post-images")
      .getPublicUrl(safeFileName);

    return publicData.publicUrl; // Возвращаем публичный URL
  } catch (error) {
    console.error("Ошибка загрузки изображения:", error);
    throw error;
  }
}

// Открытие модального окна просмотра поста
function openPostModal(image, text, date) {
  const modal = document.getElementById("modal-view-post");
  document.getElementById("view-post-image").src = image;
  document.getElementById("view-post-text").textContent = text;
  document.getElementById("view-post-date").textContent = date;
  modal.classList.remove("hidden");
}

// Сокращение текста для превью
function truncateText(text, maxLength = 50) {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Закрытие модального окна
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
  } else {
    console.error(`Модальное окно с ID "${modalId}" не найдено.`);
  }
}

// Обработчик для кнопки добавления поста
document.getElementById("save-post-btn").addEventListener("click", async () => {
  const fileInput = document.getElementById("post-image");
  const textInput = document.getElementById("post-text");

  if (fileInput.files.length > 0 && textInput.value.trim() !== "") {
    try {
      const imageUrl = await uploadImage(fileInput.files[0]);
      await addPost(imageUrl, textInput.value);
    } catch (error) {
      console.error("Ошибка загрузки изображения:", error);
    }
  } else {
    alert("Пожалуйста, выберите изображение и введите описание!");
  }
});

// Обработчики для кнопок открытия/закрытия модальных окон
document.getElementById("add-post-btn").addEventListener("click", () => {
  document.getElementById("modal-add-post").classList.remove("hidden");
});

document.getElementById("close-view-modal").addEventListener("click", () =>
  closeModal("modal-view-post")
);

document.getElementById("close-modal").addEventListener("click", () =>
  closeModal("modal-add-post")
);

// Загрузка постов при старте
loadPosts();
