import Swal from "sweetalert2";

export const showAlert = (title, text, icon = "info") => {
  return Swal.fire({
    title,
    text,
    icon,
  });
};

//import { showAlert } from "./utils/alerts.js";
