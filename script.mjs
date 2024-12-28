import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://huymzjfswngqudqkazyt.supabase.co"; // Замените на ваш проект Supabase URL
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eW16amZzd25ncXVkcWthenl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDU4OTgsImV4cCI6MjA1MDg4MTg5OH0.V18YpLMoL8Fr7Hv3LyXfIhzd2y6U9XzRSq8em0ngs30"; // Вставьте ваш публичный API-ключ
const supabase = createClient(supabaseUrl, supabaseKey);

let posts = [];
let isLoading = false; // Флаг, указывающий на текущую загрузку
let allPostsLoaded = false; // Флаг, указывающий, что все посты загружены
let currentPage = 1;
const postsPerPage = 5;

// Загрузка постов из Supabase и их рендер
async function loadPosts(page = 1) {
  if (isLoading || allPostsLoaded) return; // Если идет загрузка или все посты загружены, выходим

  isLoading = true;
  const loadingElement = document.getElementById("loading");
  loadingElement.classList.remove("hidden");

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("date", { ascending: true })
      .range((page - 1) * postsPerPage, page * postsPerPage - 1);

    if (error) throw error;

    if (data.length < postsPerPage) {
      allPostsLoaded = true; // Если данных меньше, чем postsPerPage, значит, это последняя страница
    }

    data.forEach((post) => {
      renderPost(post);
    });

    currentPage = page; // Обновляем текущую страницу
  } catch (error) {
    console.error("Ошибка загрузки постов:", error);
  } finally {
    isLoading = false;
    loadingElement.classList.add("hidden");
  }
}

// Рендеринг 1 поста
function renderPost(post) {
  const container = document.getElementById("post-container");
  const postElement = document.createElement("div");
  postElement.className = "post";

  // Маленькая картинка
  const imgElement = document.createElement("img");
  imgElement.src = post.small_image; // URL маленькой картинки
  imgElement.alt = "Картинка поста";
  imgElement.style.objectFit = "cover";
  imgElement.style.width = "100%";
  imgElement.style.height = "200px";

  // Контент поста
  postElement.innerHTML = `
    <div class="post-content">
      <p class="post-text">${truncateText(post.description)}</p>
      <p class="post-date">${post.date}</p>
    </div>
  `;

  postElement.addEventListener("click", () => openPostModal(post));
  postElement.prepend(imgElement);
  container.appendChild(postElement);
}

// Добавление нового поста
async function addPost(imageUrls, description) {
  const date = new Date().toLocaleString();

  try {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ 
        small_image: imageUrls.smallUrl, // Ссылка на маленькую картинку
        original_image: imageUrls.originalUrl, // Ссылка на оригинал
        description, 
        date 
      }])
      .select("*");

    if (error) {
      console.error("Ошибка добавления поста:", error.message);
      return;
    }

    console.log("Успешно добавлено:", data);
    renderPost(data[0]); // Отображаем пост с маленькой картинкой
    closeModal("modal-add-post");
  } catch (error) {
    console.error("Ошибка добавления поста (catch):", error);
  }
}

async function resizeImage(file, maxWidth, maxHeight) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 1); // JPEG с 80% качеством
  });
}

// Загрузка изображения в Supabase
async function uploadImage(file) {
  const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "")}`;

  // Сжатие для маленькой версии (360x480)
  const resizedFile = await resizeImage(file, 360, 480);

  // Загружаем маленькую версию
  const { data: smallData, error: smallError } = await supabase.storage
    .from("post-images")
    .upload(`small/${safeFileName}`, resizedFile);

  if (smallError) throw smallError;

  // Загружаем оригинал
  const { data: originalData, error: originalError } = await supabase.storage
    .from("post-images")
    .upload(`original/${safeFileName}`, file);

  if (originalError) throw originalError;

  // Получаем публичные URL для обеих версий
  const { data: smallPublicData } = supabase.storage
    .from("post-images")
    .getPublicUrl(`small/${safeFileName}`);
  const { data: originalPublicData } = supabase.storage
    .from("post-images")
    .getPublicUrl(`original/${safeFileName}`);

  return {
    smallUrl: smallPublicData.publicUrl,
    originalUrl: originalPublicData.publicUrl,
  };
}

// Открытие модального окна просмотра поста
function openPostModal(post) {
  const modal = document.getElementById("modal-view-post");

  // Устанавливаем контент модального окна
  document.getElementById("view-post-image").src = post.small_image; // Маленькая картинка
  document.getElementById("view-post-text").textContent = post.description;
  document.getElementById("view-post-date").textContent = post.date;

  // Добавляем кнопку для скачивания оригинала
  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Скачать оригинал";
  downloadButton.className = "download-button";
  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = post.original_image; // URL оригинала
    link.download = post.original_image.split("/").pop(); // Имя файла
    link.click();
  });

  // Убедимся, что кнопка добавляется только один раз
  const existingButton = modal.querySelector(".download-button");
  if (existingButton) {
    existingButton.remove();
  }
  modal.querySelector(".modal-content").appendChild(downloadButton);

  // Показываем модальное окно
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

window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
    !isLoading &&
    !allPostsLoaded
  ) {
    loadPosts(currentPage + 1); // Загружаем следующую страницу
  }
});

// Загрузка постов при старте
loadPosts();
