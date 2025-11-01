import formidable from "formidable";

export interface FormParseResult {
  valueFields: formidable.Fields;
  fileFields: formidable.Files;
}
