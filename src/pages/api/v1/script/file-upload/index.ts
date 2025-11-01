// import { WithMiddleware } from "@/middlewares/WithMiddleware";
// import { NextApiRequest, NextApiResponse } from "next";

// export const config = { api: { bodyParser: false } };

// export default WithMiddleware(
//   /**
//    * Used to send I/O as text to the script.
//    * ### Request
//    * - Content-Type: text/plain
//    * - Any non-ASCII file will be rejected
//    *
//    * ### Response
//    * ```json
//    * {
//    *     stdout: string,
//    *     stderr: string,
//    * }
//    * ```
//    */
//   async function POST(req: NextApiRequest, res: NextApiResponse) {
//     RequestValidationParser.parse({ req, method: HttpMethodTypes.POST });
//   }
// );
