import Swal from "sweetalert2";

export const showAlert = (title, text, icon = "info") => {
  return Swal.fire({
    title,
    text,
    icon,
  });
};

export const showLoading = (text = "Cargando...") => {
  Swal.fire({
    title: text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const closeLoading = () => {
  Swal.close();
};

//import { showAlert } from "./utils/alerts.js";
