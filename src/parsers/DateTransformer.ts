import { AutoSetFields } from "@/types";

interface TypeWithTimestampDates {
  createdOn: FirebaseFirestore.Timestamp;
  lastModifiedOn: FirebaseFirestore.Timestamp;
  ttl?: FirebaseFirestore.Timestamp;
}

type TypeWithStringDates<T extends TypeWithTimestampDates> = Omit<T, AutoSetFields> & {
  createdOn: string;
  lastModifiedOn: string;
  ttl?: string;
};

export class DateTransformer {
  static transform<T extends TypeWithTimestampDates>(data: T): TypeWithStringDates<T> {
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      year: "numeric",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    const { createdOn, lastModifiedOn, ttl, ...rest } = data;

    // convert timestamps to human readable strings
    const newData: TypeWithStringDates<T> = {
      createdOn: createdOn.toDate().toLocaleDateString("en-US", dateOptions),
      lastModifiedOn: lastModifiedOn.toDate().toLocaleDateString("en-US", dateOptions),
      ...rest,
    };

    if (ttl != null) {
      newData.ttl = ttl.toDate().toLocaleDateString("en-US", dateOptions);
    }

    return newData;
  }
}
