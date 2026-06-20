export interface CardPair {
  image: string;
  description: string;
}

export interface Card {
  id: string;
  pairId: number;
  type: "image" | "text";
  content: string;
}

export const CARD_PAIRS: CardPair[] = [
  {
    image: "/phapnhat.png",
    description: "Hai thế lực áp bức dân tộc năm 1945.",
  },
  {
    image: "/doi1945.png",
    description: "Nạn đói cướp đi hơn 2 triệu sinh mạng.",
  },
  {
    image: "/nole.png",
    description: "Thân phận dân tộc nô lệ thời thuộc địa.",
  },
  {
    image: "/kehoach.jpg",
    description: "Các chiến sĩ Việt Minh họp bàn kế hoạch.",
  },
  {
    image: "/nhathavuki.png",
    description: "Quân Nhật hạ vũ khí, buông súng trước quân Đồng minh.",
  },
  {
    image: "/thoico.jpg",
    description: "Thời cơ cách mạng đã chín muồi.",
  },
  {
    image: "/quangtruong.jpg",
    description: "Quảng trường Ba Đình",
  },
  {
    image: "/bacHodoctuyenngon.webp",
    description: "Bác Hồ đọc bản Tuyên ngôn Độc lập.",
  },
  {
    image: "/chiacat.webp",
    description: "Đất nước bị chia cắt.",
  },
];
