import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiskContext } from "../../context/RiskContext";
import { stressInputSchema, validateStressInputs } from "../../schemas/stressInputSchema";

const fields = Object.values(stressInputSchema);
const pages = [...new Set(fields.map((field) => field.category))]
  .map((category) => fields.filter((field) => field.category === category));

export function useStressViewModel() {
  const { stressInputs, setStressInputs, completeModule } = useContext(RiskContext);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [errors, setErrors] = useState({});
  const set = (name) => (value) => {
    setStressInputs((current) => ({ ...current, [name]: value === "" ? "" : Number(value) }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };
  const handleSave = () => {
    const nextErrors = validateStressInputs(stressInputs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setPage(pages.findIndex((items) => items.some(({ name }) => nextErrors[name])));
      return;
    }
    completeModule("stress", stressInputs);
    navigate("/assessment");
  };
  return { stressInputs, errors, set, pages, page, setPage, handleSave };
}
