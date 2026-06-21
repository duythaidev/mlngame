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

export const REVEAL_TIMEOUT_SECONDS = 60;

export const CARD_PAIRS: CardPair[] = [
  {
    image: "/mln2/banvidau.avif",
    description: "Bản vị dầu",
  },
  {
    image: "/mln2/banvivang.jpg",
    description: "Bản vị vàng",
  },
  {
    image: "/mln2/thuocdogiatri.webp",
    description: "Thước đo giá trị",
  },
  {
    image: "/mln2/traodoingayxua.png",
    description: "Hình thái giá trị giản đơn",
  },
  {
    image: "/mln2/hangtienhang.png",
    description: "Sơ đồ H - T - H",
  },
  {
    image: "/mln2/phuongtienluutru.webp",
    description: "Phương tiện lưu trữ",
  },
  {
    image: "/mln2/quanhesanxuat.png",
    description: "Quan hệ sản xuất",
  },
  {
    image: "/mln2/tienhangtien.jpg",
    description: "Sơ đồ T - H - T'",
  },
  {
    image: "/mln2/nganhang.jpg",
    description: "Ngân hàng trung ương",
  },
  {
    image: "/mln2/dongtienquocte.jpg",
    description: "Đồng tiền quốc tế",
  }
];
